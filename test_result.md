# Test Results - HR Bank

## Latest Test Session: Hybrid Work Type Architecture

### Test Date: December 19, 2025

### Feature: Hybrid Work Type (Occupation Template Default + Role Override)

### Test Scenarios:

1. **API Tests:**
   - [ ] GET /api/admin/occupations/default-work-type/{occupation_title} returns correct defaults
   - [ ] Security Guard returns "continental"
   - [ ] Delivery Driver returns "route_based"
   - [ ] Server returns "on_site"

2. **Frontend Tests:**
   - [ ] Role form shows default work type when occupation is selected
   - [ ] "Default" badge appears on the correct work type card
   - [ ] Info box shows occupation name and default work type
   - [ ] Changing occupation updates the work type automatically
   - [ ] Employer can override the default work type
   - [ ] "Reset to default" button appears when overridden
   - [ ] Creating a role with overridden work type saves correctly

3. **End-to-End Flow:**
   - [ ] Create role with "Security Guard" occupation → should auto-select Continental
   - [ ] Create role with "Delivery Driver" occupation → should auto-select Route-Based
   - [ ] Override work type and verify it persists after save

### Incorporate User Feedback:
- Test the hybrid work type architecture thoroughly
- Verify the inheritance from occupation template to role works correctly
- Confirm employer override capability
