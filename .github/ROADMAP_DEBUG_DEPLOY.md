# Debug & Deploy Workflow Roadmap

**Status:** Implementation Plan  
**Created:** 2026-09-12  
**Incident:** Missing Newman artifact in SKYGRID smoke test

---

## 📋 Overview

Comprehensive roadmap for implementing automated debug and deploy workflows to prevent future `artifacts/newman/latest-summary.json` failures.

---

## Phase 1: Immediate Actions (This Sprint)

### 1.1 Pre-Flight Validation
- [ ] Add artifact existence check before smoke tests
- [ ] Create `scripts/validate-artifacts.sh`
- [ ] Integrate into workflow pre-execution

### 1.2 Newman Test Generation
- [ ] Ensure API test suite runs and generates Newman summary
- [ ] Verify `artifacts/newman/latest-summary.json` is created
- [ ] Add error handling for test failures

### 1.3 Artifact Upload
- [ ] Configure GitHub Actions artifact upload
- [ ] Store Newman summaries for 30 days
- [ ] Enable debugging from failed runs

---

## Phase 2: Debug Workflow (Week 1)

### 2.1 Failure Capture
- [ ] Create `.github/workflows/debug-on-failure.yml`
- [ ] Capture logs, artifacts, and environment state
- [ ] Upload diagnostic bundle to Actions artifacts

### 2.2 Debug Outputs
```
📦 Debug Bundle (on failure):
  ├── logs/
  │   ├── smoke-test.log
  │   ├── api-responses.log
  │   └── env-vars.log
  ├── artifacts/
  │   ├── newman/
  │   └── api-responses.json
  └── summary.md
```

### 2.3 Notifications
- [ ] Post failure summary to workflow logs
- [ ] Include remediation steps in error output
- [ ] Attach debug bundle link

---

## Phase 3: Deploy Workflow (Week 1)

### 3.1 Deployment Pipeline
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Define stages: test → build → deploy
- [ ] Add environment-specific configurations

### 3.2 Deployment Targets
- [ ] Staging deployment on successful main branch builds
- [ ] Production deployment on tagged releases
- [ ] Rollback capability on deployment failures

### 3.3 Post-Deploy Validation
- [ ] Run smoke tests on deployed environment
- [ ] Verify Newman artifact generation
- [ ] Health checks for all endpoints

---

## Phase 4: Prevention & Monitoring (Week 2)

### 4.1 Preventive Measures
- [ ] Add branch protection rules
- [ ] Require workflow success before merge
- [ ] Mandatory artifact generation checks

### 4.2 Monitoring
- [ ] Track workflow failure rates
- [ ] Alert on repeated failures
- [ ] Generate weekly health reports

### 4.3 Documentation
- [ ] Update CONTRIBUTING.md with workflow requirements
- [ ] Document artifact generation process
- [ ] Create troubleshooting guide

---

## 🛠️ Implementation Checklist

### Workflow Files to Create
- [ ] `.github/workflows/debug-on-failure.yml`
- [ ] `.github/workflows/deploy.yml`
- [ ] `.github/workflows/pre-flight-checks.yml`

### Scripts to Create
- [ ] `scripts/validate-artifacts.sh`
- [ ] `scripts/generate-newman-summary.sh`
- [ ] `scripts/post-deploy-verify.sh`

### Configuration Files
- [ ] `.github/workflows/config/environments.yml`
- [ ] `.github/workflows/config/deployment-targets.yml`

### Documentation
- [ ] `.github/DEPLOYMENT_GUIDE.md`
- [ ] `.github/DEBUG_GUIDE.md`
- [ ] `.github/TROUBLESHOOTING.md`

---

## 📊 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Smoke test pass rate | 95%+ | TBD |
| Artifact generation success | 100% | TBD |
| Deploy time to staging | <5 min | TBD |
| Deploy time to production | <10 min | TBD |
| Mean time to recovery (MTTR) | <10 min | TBD |

---

## 🚀 Quick Start

### To Begin Implementation:

```bash
# 1. Create workflow directory structure
mkdir -p .github/workflows/config
mkdir -p scripts

# 2. Validate current setup
bash scripts/validate-artifacts.sh

# 3. Generate Newman test summary
bash scripts/generate-newman-summary.sh

# 4. Run pre-flight checks
bash scripts/pre-flight-checks.sh

# 5. Deploy to staging (when ready)
gh workflow run deploy.yml -f environment=staging
```

---

## 📞 Dependencies & Notes

- **Newman CLI** must be installed
- **GitHub Actions secrets** required for deployment targets
- **Artifact retention policy**: 30 days (configurable)
- **Deploy credentials**: Store in GitHub Secrets

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Immediate | 1 day | Today | Today |
| Phase 2: Debug | 5 days | Day 1 | Day 5 |
| Phase 3: Deploy | 5 days | Day 1 | Day 5 |
| Phase 4: Monitoring | 7 days | Day 6 | Day 12 |

**Total Completion: 12 days**

---

## Sign-Off

- [ ] Technical review
- [ ] Deployment approval
- [ ] Monitoring setup
- [ ] Team training

---

**Last Updated:** 2026-09-12  
**Next Review:** 2026-09-19
