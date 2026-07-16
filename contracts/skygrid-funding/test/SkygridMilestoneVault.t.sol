// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SkygridMilestoneVault} from "../src/SkygridMilestoneVault.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract SkygridMilestoneVaultTest is Test {
    uint256 internal constant TOTAL_BUDGET = 1_000_000e6;
    uint16 internal constant PLATFORM_FEE_BPS = 350;

    MockUSDC internal token;
    SkygridMilestoneVault internal vault;

    address internal sponsor = makeAddr("sponsor");
    address internal beneficiaryTreasury = makeAddr("beneficiary-safe");
    address internal platformTreasury = makeAddr("skygrid-safe");
    address internal governance = makeAddr("governance-safe");
    address internal approver = makeAddr("approval-safe");
    address internal outsider = makeAddr("outsider");

    uint64 internal fundingDeadline;
    uint64 internal firstDeadline;

    function setUp() public {
        vm.warp(1_800_000_000);
        token = new MockUSDC();

        uint128[] memory amounts = new uint128[](4);
        amounts[0] = 200_000e6;
        amounts[1] = 300_000e6;
        amounts[2] = 300_000e6;
        amounts[3] = 200_000e6;

        uint64[] memory deadlines = new uint64[](4);
        deadlines[0] = uint64(block.timestamp + 30 days);
        deadlines[1] = uint64(block.timestamp + 60 days);
        deadlines[2] = uint64(block.timestamp + 90 days);
        deadlines[3] = uint64(block.timestamp + 120 days);

        fundingDeadline = uint64(block.timestamp + 7 days);
        firstDeadline = deadlines[0];

        vault = new SkygridMilestoneVault(
            keccak256("SKYGRID-PILOT-001"),
            IERC20(address(token)),
            sponsor,
            beneficiaryTreasury,
            platformTreasury,
            governance,
            approver,
            PLATFORM_FEE_BPS,
            fundingDeadline,
            amounts,
            deadlines
        );

        token.mint(sponsor, TOTAL_BUDGET);
        vm.prank(sponsor);
        token.approve(address(vault), TOTAL_BUDGET);
    }

    function testSponsorFundsCompleteBudget() public {
        _fund();

        assertTrue(vault.funded());
        assertEq(token.balanceOf(address(vault)), TOTAL_BUDGET);
        assertEq(vault.totalBudget(), TOTAL_BUDGET);
        assertEq(vault.unresolvedAmount(), TOTAL_BUDGET);
        assertEq(vault.milestoneCount(), 4);
    }

    function testOnlySponsorCanFund() public {
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(SkygridMilestoneVault.OnlySponsor.selector, outsider)
        );
        vault.fund();
    }

    function testCannotFundTwice() public {
        _fund();

        vm.prank(sponsor);
        vm.expectRevert(SkygridMilestoneVault.AlreadyFunded.selector);
        vault.fund();
    }

    function testCannotFundAfterFundingDeadline() public {
        vm.warp(uint256(fundingDeadline) + 1);

        vm.prank(sponsor);
        vm.expectRevert();
        vault.fund();
    }

    function testApproverReleasesMilestoneAndSplitsFee() public {
        _fund();

        bytes32 evidenceHash = keccak256("encrypted-evidence-package");
        bytes32 approvalRef = keccak256("safe-transaction-reference");
        uint256 gross = 200_000e6;
        uint256 fee = (gross * PLATFORM_FEE_BPS) / 10_000;

        vm.prank(approver);
        vault.releaseMilestone(0, evidenceHash, approvalRef);

        assertEq(token.balanceOf(beneficiaryTreasury), gross - fee);
        assertEq(token.balanceOf(platformTreasury), fee);
        assertEq(vault.totalReleased(), gross);
        assertEq(vault.totalRefunded(), 0);
        assertEq(vault.unresolvedAmount(), TOTAL_BUDGET - gross);

        SkygridMilestoneVault.Milestone memory item = vault.milestone(0);
        assertEq(uint8(item.status), uint8(SkygridMilestoneVault.MilestoneStatus.Released));
        assertEq(item.evidenceHash, evidenceHash);
        assertEq(item.approvalRef, approvalRef);
    }

    function testNonApproverCannotRelease() public {
        _fund();

        vm.prank(outsider);
        vm.expectRevert();
        vault.releaseMilestone(0, keccak256("evidence"), keccak256("approval"));
    }

    function testReleaseRequiresEvidenceAndApprovalReference() public {
        _fund();

        vm.startPrank(approver);
        vm.expectRevert(SkygridMilestoneVault.MissingEvidence.selector);
        vault.releaseMilestone(0, bytes32(0), keccak256("approval"));

        vm.expectRevert(SkygridMilestoneVault.MissingApprovalReference.selector);
        vault.releaseMilestone(0, keccak256("evidence"), bytes32(0));
        vm.stopPrank();
    }

    function testCannotReleaseAfterMilestoneDeadline() public {
        _fund();
        vm.warp(uint256(firstDeadline) + 1);

        vm.prank(approver);
        vm.expectRevert();
        vault.releaseMilestone(0, keccak256("evidence"), keccak256("approval"));
    }

    function testSponsorRefundsExpiredUnresolvedMilestone() public {
        _fund();
        uint256 sponsorBalanceBefore = token.balanceOf(sponsor);
        vm.warp(uint256(firstDeadline) + 1);

        vm.prank(sponsor);
        vault.refundMilestone(0);

        assertEq(token.balanceOf(sponsor), sponsorBalanceBefore + 200_000e6);
        assertEq(vault.totalRefunded(), 200_000e6);
        assertEq(vault.unresolvedAmount(), TOTAL_BUDGET - 200_000e6);

        SkygridMilestoneVault.Milestone memory item = vault.milestone(0);
        assertEq(uint8(item.status), uint8(SkygridMilestoneVault.MilestoneStatus.Refunded));
    }

    function testCannotRefundBeforeDeadline() public {
        _fund();

        vm.prank(sponsor);
        vm.expectRevert();
        vault.refundMilestone(0);
    }

    function testMilestoneCannotBeResolvedTwice() public {
        _fund();

        vm.prank(approver);
        vault.releaseMilestone(0, keccak256("evidence"), keccak256("approval"));

        vm.warp(uint256(firstDeadline) + 1);
        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(
                SkygridMilestoneVault.MilestoneAlreadyResolved.selector,
                0
            )
        );
        vault.refundMilestone(0);
    }

    function testPauseBlocksReleaseButDoesNotTrapExpiredRefund() public {
        _fund();

        vm.prank(governance);
        vault.pause();

        vm.prank(approver);
        vm.expectRevert();
        vault.releaseMilestone(0, keccak256("evidence"), keccak256("approval"));

        vm.warp(uint256(firstDeadline) + 1);
        vm.prank(sponsor);
        vault.refundMilestone(0);

        assertEq(vault.totalRefunded(), 200_000e6);
    }

    function testPaymentTokenCannotBeRecoveredByGovernance() public {
        _fund();

        vm.prank(governance);
        vm.expectRevert(SkygridMilestoneVault.PaymentTokenRecoveryForbidden.selector);
        vault.recoverUnsupportedToken(IERC20(address(token)), governance);
    }

    function testGovernanceCanRecoverUnrelatedToken() public {
        MockUSDC unrelated = new MockUSDC();
        unrelated.mint(address(vault), 10e6);

        vm.prank(governance);
        vault.recoverUnsupportedToken(IERC20(address(unrelated)), governance);

        assertEq(unrelated.balanceOf(governance), 10e6);
        assertEq(unrelated.balanceOf(address(vault)), 0);
    }

    function testRejectsNativeCurrency() public {
        vm.deal(address(this), 1 ether);

        (bool success, bytes memory revertData) = address(vault).call{value: 1 ether}("");

        assertFalse(success);
        assertEq(bytes4(revertData), SkygridMilestoneVault.NativeCurrencyNotAccepted.selector);
        assertEq(address(vault).balance, 0);
    }

    function testConstructorRejectsFeeAboveHardCeiling() public {
        uint128[] memory amounts = new uint128[](1);
        amounts[0] = 1e6;
        uint64[] memory deadlines = new uint64[](1);
        deadlines[0] = uint64(block.timestamp + 30 days);

        vm.expectRevert(
            abi.encodeWithSelector(SkygridMilestoneVault.InvalidPlatformFee.selector, 1_001)
        );
        new SkygridMilestoneVault(
            keccak256("SKYGRID-PILOT-INVALID-FEE"),
            IERC20(address(token)),
            sponsor,
            beneficiaryTreasury,
            platformTreasury,
            governance,
            approver,
            1_001,
            uint64(block.timestamp + 7 days),
            amounts,
            deadlines
        );
    }

    function _fund() internal {
        vm.prank(sponsor);
        vault.fund();
    }
}

contract SkygridVaultHandler is Test {
    SkygridMilestoneVault internal immutable vault;
    address internal immutable sponsor;
    address internal immutable approver;

    constructor(SkygridMilestoneVault vault_, address sponsor_, address approver_) {
        vault = vault_;
        sponsor = sponsor_;
        approver = approver_;
    }

    function advanceTime(uint256 secondsForward) external {
        secondsForward = bound(secondsForward, 0, 180 days);
        vm.warp(block.timestamp + secondsForward);
    }

    function release(uint256 rawId, bytes32 evidenceHash, bytes32 approvalRef) external {
        uint256 count = vault.milestoneCount();
        uint256 milestoneId = rawId % count;
        SkygridMilestoneVault.Milestone memory item = vault.milestone(milestoneId);

        if (
            item.status != SkygridMilestoneVault.MilestoneStatus.Pending
                || block.timestamp > item.deadline
        ) return;

        if (evidenceHash == bytes32(0)) evidenceHash = bytes32(uint256(1));
        if (approvalRef == bytes32(0)) approvalRef = bytes32(uint256(2));

        vm.prank(approver);
        try vault.releaseMilestone(milestoneId, evidenceHash, approvalRef) {} catch {}
    }

    function refund(uint256 rawId) external {
        uint256 count = vault.milestoneCount();
        uint256 milestoneId = rawId % count;
        SkygridMilestoneVault.Milestone memory item = vault.milestone(milestoneId);

        if (
            item.status != SkygridMilestoneVault.MilestoneStatus.Pending
                || block.timestamp <= item.deadline
        ) return;

        vm.prank(sponsor);
        try vault.refundMilestone(milestoneId) {} catch {}
    }
}

contract SkygridMilestoneVaultInvariantTest is StdInvariant, Test {
    uint256 internal constant TOTAL_BUDGET = 1_000_000e6;

    MockUSDC internal token;
    SkygridMilestoneVault internal vault;
    SkygridVaultHandler internal handler;

    address internal sponsor = makeAddr("invariant-sponsor");
    address internal beneficiaryTreasury = makeAddr("invariant-beneficiary-safe");
    address internal platformTreasury = makeAddr("invariant-platform-safe");
    address internal governance = makeAddr("invariant-governance-safe");
    address internal approver = makeAddr("invariant-approver-safe");

    function setUp() public {
        vm.warp(1_800_000_000);
        token = new MockUSDC();

        uint128[] memory amounts = new uint128[](4);
        amounts[0] = 200_000e6;
        amounts[1] = 300_000e6;
        amounts[2] = 300_000e6;
        amounts[3] = 200_000e6;

        uint64[] memory deadlines = new uint64[](4);
        deadlines[0] = uint64(block.timestamp + 30 days);
        deadlines[1] = uint64(block.timestamp + 60 days);
        deadlines[2] = uint64(block.timestamp + 90 days);
        deadlines[3] = uint64(block.timestamp + 120 days);

        vault = new SkygridMilestoneVault(
            keccak256("SKYGRID-INVARIANT-PILOT"),
            IERC20(address(token)),
            sponsor,
            beneficiaryTreasury,
            platformTreasury,
            governance,
            approver,
            350,
            uint64(block.timestamp + 7 days),
            amounts,
            deadlines
        );

        token.mint(sponsor, TOTAL_BUDGET);
        vm.startPrank(sponsor);
        token.approve(address(vault), TOTAL_BUDGET);
        vault.fund();
        vm.stopPrank();

        handler = new SkygridVaultHandler(vault, sponsor, approver);
        targetContract(address(handler));
    }

    function invariantBudgetIsAlwaysConserved() public {
        uint256 accounted = token.balanceOf(address(vault)) + vault.totalReleased()
            + vault.totalRefunded();
        assertEq(accounted, vault.totalBudget());
    }

    function invariantResolvedAmountsNeverExceedBudget() public {
        assertLe(vault.totalReleased() + vault.totalRefunded(), vault.totalBudget());
    }
}
