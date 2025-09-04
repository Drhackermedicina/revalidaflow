# Test Plan for Backend Delayed Activation

## Objective
Validate the implementation of delayed backend activation in the SimulationView component, where the backend is only activated on the second "Estou Pronto" click instead of during navigation.

## Test Cases

### 1. Navigation to Simulation Without Session Creation
**Description:** Verify that users can navigate to the simulation view without creating a session first.
**Steps:**
1. Navigate to simulation view from StationList
2. Check URL parameters (should not contain sessionId)
3. Verify component mounts successfully in view mode
**Expected Results:**
- URL contains only station ID, no sessionId parameter
- SimulationView loads in view mode (setupSession called without sessionId)
- UI shows simulation content but backend-dependent features are disabled

### 2. First "Estou Pronto" Click (Local Readiness)
**Description:** Verify that the first click handles local readiness state without backend activation.
**Steps:**
1. Click "Estou Pronto" button once
2. Observe UI state changes
3. Check console logs for local readiness confirmation
**Expected Results:**
- UI updates to show "Localmente Pronto" state
- No API calls to /api/activate-backend made
- Ready state stored locally only
- Button remains enabled for second click

### 3. Second "Estou Pronto" Click (Backend Activation)
**Description:** Verify that the second click triggers backend activation and session creation.
**Steps:**
1. Click "Estou Pronto" button a second time
2. Monitor network requests for API call
3. Check session ID reception and storage
**Expected Results:**
- POST request to /api/activate-backend with correct payload
- Session ID received and stored in component state
- UI transitions to "Ativando Backend" state
- WebSocket connection initiation triggered

### 4. WebSocket Connection After Backend Activation
**Description:** Verify WebSocket connects successfully after backend activation.
**Steps:**
1. After successful backend activation
2. Check WebSocket connection establishment
3. Verify real-time message handling
**Expected Results:**
- WebSocket connects to correct endpoint (wss:// or ws://)
- Connection open event logged
- Real-time updates received and processed
- Error handling for connection failures

### 5. Simulation Start After Activation
**Description:** Verify simulation starts correctly after backend activation.
**Steps:**
1. Complete backend activation
2. Verify simulation data loading
3. Check timer and interaction features
**Expected Results:**
- Station data loaded from Firestore (fetchSimulationData success)
- Timer starts counting down
- User interactions enabled (e.g., answer submission)
- UI transitions to active simulation state

### 6. Error Handling During Backend Activation
**Description:** Verify graceful error handling during backend activation process.
**Steps:**
1. Simulate API failure (network error, server error)
2. Check error handling and user feedback
3. Verify recovery options
**Expected Results:**
- Appropriate error messages displayed to user
- UI state reset to allow retry
- Console logs detailed error information
- User can attempt activation again

### 7. Responsive UI During Different States
**Description:** Verify UI responsiveness across all activation states.
**Steps:**
1. Test UI in all states: loading, ready, activating, active, error
2. Check button states (enabled/disabled)
3. Verify loading indicators and status messages
**Expected Results:**
- Buttons disabled appropriately during loading/activation
- Loading spinners visible during async operations
- Status messages clear and informative
- UI remains responsive throughout state transitions

## Implementation Verification Points

- [ ] SimulationView.vue setupSession handles view mode without sessionId
- [ ] fetchSimulationData works with Firestore-only data loading
- [ ] connectWebSocket only called after backend activation
- [ ] Backend activation API call includes correct parameters
- [ ] Error states properly handled and communicated
- [ ] UI state management consistent across components

## Tools Needed for Testing
- Browser developer tools (network tab, console)
- Firebase console for Firestore monitoring
- WebSocket debugging tools
- API testing tools (Postman/curl for manual API calls)

## Success Criteria
- All test cases pass with expected behavior
- No regression in existing simulation functionality
- User experience smooth across all activation states
- Error scenarios handled gracefully without crashes