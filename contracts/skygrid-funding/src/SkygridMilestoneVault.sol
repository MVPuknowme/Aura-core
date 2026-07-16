// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SKYGRID Milestone Vault
/// @notice Holds one approved ERC-20 payment asset for a defined SKYGRID pilot and
///         releases each milestone only after approval by the configured approver.
/// @dev The approver and governance addresses should be multisignature wallets.
///      This contract does not issue a token, promise yield, or autonomously price work.
contract SkygridMilestoneVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint16 public constant MAX_PLATFORM_FEE_BPS = 1_000; // 10% hard ceiling

    enum MilestoneStatus {
        Pending,
        Released,
        Refunded
    }

    struct Milestone {
        uint128 grossAmount;
        uint64 deadline;
        MilestoneStatus status;
        bytes32 evidenceHash;
        bytes32 approvalRef;
    }

    error ZeroAddress();
    error InvalidProjectId();
    error InvalidMilestoneConfiguration();
    error InvalidFundingDeadline();
    error InvalidPlatformFee(uint256 feeBps);
    error OnlySponsor(address caller);
    error FundingClosed(uint256 currentTime, uint256 deadline);
    error AlreadyFunded();
    error VaultNotFunded();
    error UnsupportedPaymentTokenBehavior(uint256 expected, uint256 received);
    error InvalidMilestone(uint256 milestoneId);
    error MilestoneAlreadyResolved(uint256 milestoneId);
    error MilestoneReleaseExpired(uint256 milestoneId, uint256 deadline);
    error RefundNotAvailable(uint256 milestoneId, uint256 deadline);
    error MissingEvidence();
    error MissingApprovalReference();
    error PaymentTokenRecoveryForbidden();
    error NativeCurrencyNotAccepted();

    event VaultFunded(address indexed sponsor, uint256 amount);
    event MilestoneReleased(
        uint256 indexed milestoneId,
        bytes32 indexed evidenceHash,
        bytes32 indexed approvalRef,
        uint256 grossAmount,
        uint256 platformFee,
        uint256 beneficiaryAmount
    );
    event MilestoneRefunded(uint256 indexed milestoneId, address indexed sponsor, uint256 amount);
    event UnsupportedTokenRecovered(
        address indexed token, address indexed recipient, uint256 amount
    );

    bytes32 public immutable projectId;
    IERC20 public immutable paymentToken;
    address public immutable sponsor;
    address public immutable beneficiaryTreasury;
    address public immutable platformTreasury;
    uint16 public immutable platformFeeBps;
    uint64 public immutable fundingDeadline;
    uint256 public immutable totalBudget;

    bool public funded;
    uint256 public totalReleased;
    uint256 public totalRefunded;

    Milestone[] private _milestones;

    modifier onlySponsor() {
        if (msg.sender != sponsor) revert OnlySponsor(msg.sender);
        _;
    }

    constructor(
        bytes32 projectId_,
        IERC20 paymentToken_,
        address sponsor_,
        address beneficiaryTreasury_,
        address platformTreasury_,
        address governance_,
        address approver_,
        uint16 platformFeeBps_,
        uint64 fundingDeadline_,
        uint128[] memory milestoneAmounts_,
        uint64[] memory milestoneDeadlines_
    ) {
        if (projectId_ == bytes32(0)) revert InvalidProjectId();
        if (
            address(paymentToken_) == address(0) || sponsor_ == address(0)
                || beneficiaryTreasury_ == address(0) || platformTreasury_ == address(0)
                || governance_ == address(0) || approver_ == address(0)
        ) revert ZeroAddress();
        if (address(paymentToken_).code.length == 0) revert ZeroAddress();
        if (platformFeeBps_ > MAX_PLATFORM_FEE_BPS) {
            revert InvalidPlatformFee(platformFeeBps_);
        }

        uint256 milestoneCount_ = milestoneAmounts_.length;
        if (milestoneCount_ == 0 || milestoneCount_ != milestoneDeadlines_.length) {
            revert InvalidMilestoneConfiguration();
        }
        if (fundingDeadline_ <= block.timestamp || fundingDeadline_ >= milestoneDeadlines_[0]) {
            revert InvalidFundingDeadline();
        }

        uint256 budget;
        uint64 previousDeadline;
        for (uint256 i; i < milestoneCount_; ++i) {
            uint128 amount = milestoneAmounts_[i];
            uint64 deadline = milestoneDeadlines_[i];
            if (
                amount == 0 || deadline <= block.timestamp
                    || (i > 0 && deadline <= previousDeadline)
            ) {
                revert InvalidMilestoneConfiguration();
            }

            budget += amount;
            previousDeadline = deadline;
            _milestones.push(
                Milestone({
                    grossAmount: amount,
                    deadline: deadline,
                    status: MilestoneStatus.Pending,
                    evidenceHash: bytes32(0),
                    approvalRef: bytes32(0)
                })
            );
        }

        projectId = projectId_;
        paymentToken = paymentToken_;
        sponsor = sponsor_;
        beneficiaryTreasury = beneficiaryTreasury_;
        platformTreasury = platformTreasury_;
        platformFeeBps = platformFeeBps_;
        fundingDeadline = fundingDeadline_;
        totalBudget = budget;

        _grantRole(DEFAULT_ADMIN_ROLE, governance_);
        _grantRole(PAUSER_ROLE, governance_);
        _grantRole(APPROVER_ROLE, approver_);
    }

    /// @notice Funds the complete pilot budget in a single transaction.
    /// @dev The sponsor must approve exactly `totalBudget` before calling.
    function fund() external onlySponsor whenNotPaused nonReentrant {
        if (funded) revert AlreadyFunded();
        if (block.timestamp > fundingDeadline) {
            revert FundingClosed(block.timestamp, fundingDeadline);
        }

        uint256 balanceBefore = paymentToken.balanceOf(address(this));
        paymentToken.safeTransferFrom(sponsor, address(this), totalBudget);
        uint256 received = paymentToken.balanceOf(address(this)) - balanceBefore;
        if (received != totalBudget) {
            revert UnsupportedPaymentTokenBehavior(totalBudget, received);
        }

        funded = true;
        emit VaultFunded(sponsor, received);
    }

    /// @notice Releases one milestone after the approver validates its evidence.
    /// @param milestoneId Index of the milestone.
    /// @param evidenceHash Hash of the off-chain evidence package; never store sensitive data directly.
    /// @param approvalRef Hash/reference for the signed approval record or governance decision.
    function releaseMilestone(uint256 milestoneId, bytes32 evidenceHash, bytes32 approvalRef)
        external
        onlyRole(APPROVER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (!funded) revert VaultNotFunded();
        Milestone storage milestone = _milestoneAt(milestoneId);
        if (milestone.status != MilestoneStatus.Pending) {
            revert MilestoneAlreadyResolved(milestoneId);
        }
        if (block.timestamp > milestone.deadline) {
            revert MilestoneReleaseExpired(milestoneId, milestone.deadline);
        }
        if (evidenceHash == bytes32(0)) revert MissingEvidence();
        if (approvalRef == bytes32(0)) revert MissingApprovalReference();

        uint256 grossAmount = milestone.grossAmount;
        uint256 fee = (grossAmount * platformFeeBps) / BPS_DENOMINATOR;
        uint256 beneficiaryAmount = grossAmount - fee;

        milestone.status = MilestoneStatus.Released;
        milestone.evidenceHash = evidenceHash;
        milestone.approvalRef = approvalRef;
        totalReleased += grossAmount;

        paymentToken.safeTransfer(beneficiaryTreasury, beneficiaryAmount);
        if (fee != 0) paymentToken.safeTransfer(platformTreasury, fee);

        emit MilestoneReleased(
            milestoneId, evidenceHash, approvalRef, grossAmount, fee, beneficiaryAmount
        );
    }

    /// @notice Refunds an unresolved milestone after its deadline.
    /// @dev Refunds deliberately remain available while the vault is paused so governance
    ///      cannot use the emergency stop to trap sponsor funds.
    function refundMilestone(uint256 milestoneId) external onlySponsor nonReentrant {
        if (!funded) revert VaultNotFunded();
        Milestone storage milestone = _milestoneAt(milestoneId);
        if (milestone.status != MilestoneStatus.Pending) {
            revert MilestoneAlreadyResolved(milestoneId);
        }
        if (block.timestamp <= milestone.deadline) {
            revert RefundNotAvailable(milestoneId, milestone.deadline);
        }

        uint256 amount = milestone.grossAmount;
        milestone.status = MilestoneStatus.Refunded;
        totalRefunded += amount;

        paymentToken.safeTransfer(sponsor, amount);
        emit MilestoneRefunded(milestoneId, sponsor, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Recovers unrelated tokens accidentally sent to the vault.
    /// @dev The configured payment token cannot be recovered through this function.
    function recoverUnsupportedToken(IERC20 token, address recipient)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (address(token) == address(paymentToken)) {
            revert PaymentTokenRecoveryForbidden();
        }
        if (recipient == address(0)) revert ZeroAddress();

        uint256 amount = token.balanceOf(address(this));
        token.safeTransfer(recipient, amount);
        emit UnsupportedTokenRecovered(address(token), recipient, amount);
    }

    function milestoneCount() external view returns (uint256) {
        return _milestones.length;
    }

    function milestone(uint256 milestoneId) external view returns (Milestone memory) {
        if (milestoneId >= _milestones.length) revert InvalidMilestone(milestoneId);
        return _milestones[milestoneId];
    }

    function unresolvedAmount() external view returns (uint256) {
        return totalBudget - totalReleased - totalRefunded;
    }

    function expectedPlatformFee(uint256 milestoneId) external view returns (uint256) {
        Milestone storage item = _milestoneAt(milestoneId);
        return (uint256(item.grossAmount) * platformFeeBps) / BPS_DENOMINATOR;
    }

    receive() external payable {
        revert NativeCurrencyNotAccepted();
    }

    function _milestoneAt(uint256 milestoneId) internal view returns (Milestone storage item) {
        if (milestoneId >= _milestones.length) revert InvalidMilestone(milestoneId);
        item = _milestones[milestoneId];
    }
}
