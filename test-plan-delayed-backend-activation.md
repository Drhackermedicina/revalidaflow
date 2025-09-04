# Test Plan: Delayed Backend Activation (Fase 1)

## Overview
This test plan validates the implementation of delayed backend activation in the SimulationView component. The key change is that the backend is only activated when both users click "Estou Pronto" for the second time, instead of being activated during navigation.

## Test Environment Setup
- **Frontend**: Vue.js 3 application with modified SimulationView.vue
- **Backend**: Node.js server with Socket.io support
- **Database**: Firestore for station data
- **Browser**: Chrome/Firefox with developer tools
- **Network**: Local development environment

## Test Scenarios

### 1. Navigation to Simulation (View Mode)
**Objective**: Verify that users can navigate to simulation without creating a session first.

**Preconditions**:
- User is authenticated
- Station exists in Firestore
- Backend server is running

**Test Steps**:
1. Navigate to station list
2. Click on any station to start simulation
3. Verify URL format: `/app/simulation/{stationId}?role=actor`
4. Check that no sessionId parameter is present in URL
5. Verify component loads in "view mode"

**Expected Results**:
- ✅ Page loads successfully
- ✅ Station data loads from Firestore (fetchSimulationData works)
- ✅ No WebSocket connection is established automatically
- ✅ UI shows "Preparação da Simulação" section
- ✅ "Estou Pronto" button is enabled
- ✅ Console shows diagnostic logs from fetchSimulationData

**Success Criteria**:
- No API calls to `/api/create-session` during navigation
- No automatic WebSocket connection
- Station data loads correctly from Firestore
- UI is responsive and shows correct state

### 2. First "Estou Pronto" Click (Local Readiness)
**Objective**: Verify that the first click sets local readiness without backend activation.

**Preconditions**:
- User navigated to simulation in view mode
- Station data loaded successfully
- No backend activation yet

**Test Steps**:
1. Click "Estou Pronto" button once
2. Observe UI state changes
3. Check browser network tab for API calls
4. Check console logs
5. Verify button state

**Expected Results**:
- ✅ Button text changes to "Pronto!"
- ✅ Local ready state is set (myReadyState = true)
- ✅ Local session ID is generated (localSessionId)
- ✅ No API calls to backend
- ✅ No WebSocket connection attempt
- ✅ UI shows "Pronto! Aguardando parceiro..."
- ✅ Console logs show local readiness confirmation

**Success Criteria**:
- No network requests to `/api/create-session`
- No WebSocket connection established
- Local state properly updated
- UI feedback is clear and correct

### 3. Second "Estou Pronto" Click (Backend Activation)
**Objective**: Verify that the second click triggers backend activation and session creation.

**Preconditions**:
- First "Estou Pronto" click completed
- Local readiness state is true
- Partner is also ready (bothParticipantsReady = true)

**Test Steps**:
1. Click "Estou Pronto" button a second time (when partner is ready)
2. Monitor network requests
3. Check console logs for backend activation
4. Verify session ID reception
5. Check WebSocket connection establishment

**Expected Results**:
- ✅ POST request to `/api/create-session` with correct payload:
  ```json
  {
    "stationId": "station_id",
    "durationMinutes": 10,
    "localSessionId": "local_session_id"
  }
  ```
- ✅ Backend returns real session ID
- ✅ sessionId ref updated with real session ID
- ✅ WebSocket connection established with real session ID
- ✅ CLIENT_START_SIMULATION event emitted
- ✅ backendActivated set to true
- ✅ Console logs show successful activation sequence

**Success Criteria**:
- Correct API call to `/api/create-session`
- Successful session creation
- WebSocket connection with correct parameters
- Simulation start event emitted
- backendActivated flag set correctly

### 4. WebSocket Connection After Backend Activation
**Objective**: Verify WebSocket connects successfully after backend activation.

**Preconditions**:
- Backend activation completed successfully
- Real session ID received
- WebSocket connection initiated

**Test Steps**:
1. After successful backend activation
2. Check WebSocket connection status
3. Verify connection parameters
4. Test real-time message handling
5. Check error handling for connection failures

**Expected Results**:
- ✅ WebSocket connects to correct endpoint
- ✅ Connection query parameters include:
  - sessionId: real session ID
  - userId: current user ID
  - role: user role
  - stationId: station ID
- ✅ Connection status shows "Conectado"
- ✅ Real-time events work (partner join, ready states, etc.)
- ✅ Error handling for connection failures

**Success Criteria**:
- Successful WebSocket connection
- Correct connection parameters
- Real-time communication works
- Proper error handling

### 5. Simulation Start After Activation
**Objective**: Verify simulation starts correctly after backend activation.

**Preconditions**:
- Backend activated successfully
- WebSocket connected
- Both participants ready

**Test Steps**:
1. Complete backend activation process
2. Verify simulation data loading
3. Check timer initialization
4. Test interaction features
5. Verify UI state transitions

**Expected Results**:
- ✅ Station data remains loaded (from Firestore)
- ✅ Timer starts counting down from selected duration
- ✅ User interactions enabled (marking script items, etc.)
- ✅ UI transitions to active simulation state
- ✅ "Iniciar Simulação" button becomes available and functional

**Success Criteria**:
- Timer starts correctly
- All interactive features work
- UI shows correct simulation state
- No data loss during activation

### 6. Error Handling During Backend Activation
**Objective**: Verify graceful error handling during backend activation process.

**Preconditions**:
- Backend activation attempted
- Various error scenarios simulated

**Test Steps**:
1. Simulate network failure during `/api/create-session` call
2. Simulate backend server error (500 status)
3. Simulate WebSocket connection failure
4. Check error recovery mechanisms
5. Verify user feedback

**Expected Results**:
- ✅ Network errors: Clear error message displayed
- ✅ Server errors: Appropriate error handling
- ✅ WebSocket failures: Connection retry logic
- ✅ User can retry activation
- ✅ State properly reset on errors
- ✅ Console logs detailed error information

**Error Scenarios to Test**:
- Network timeout
- Backend server down
- Invalid response format
- WebSocket connection refused
- Authentication failures

**Success Criteria**:
- All errors handled gracefully
- Clear user feedback
- Recovery options available
- No application crashes

### 7. UI Responsiveness During State Transitions
**Objective**: Verify UI responsiveness across all activation states.

**Preconditions**:
- All activation states tested
- Various screen sizes

**Test Steps**:
1. Test UI in all states: loading, ready, activating, active, error
2. Check button states and availability
3. Verify loading indicators
4. Test responsive design
5. Check accessibility

**Expected Results**:
- ✅ Loading states: Progress indicators visible
- ✅ Button states: Correctly enabled/disabled
- ✅ Status messages: Clear and informative
- ✅ Responsive design: Works on mobile/tablet/desktop
- ✅ Accessibility: Screen reader friendly

**UI States to Test**:
- Initial loading (fetching station data)
- Local ready (first click)
- Waiting for partner
- Backend activating
- Backend activated
- Simulation active
- Error states

**Success Criteria**:
- Smooth state transitions
- Clear visual feedback
- Responsive across devices
- Accessible interface

## Test Execution Checklist

### Pre-Test Setup
- [ ] Backend server running
- [ ] Firestore accessible
- [ ] Test user authenticated
- [ ] Browser developer tools open
- [ ] Network and console tabs monitored

### Functional Tests
- [ ] Navigation without session creation
- [ ] First "Estou Pronto" click
- [ ] Second "Estou Pronto" click
- [ ] Backend activation API call
- [ ] WebSocket connection
- [ ] Simulation start
- [ ] Error scenarios

### UI/UX Tests
- [ ] State transitions
- [ ] Button behaviors
- [ ] Loading indicators
- [ ] Error messages
- [ ] Responsive design

### Performance Tests
- [ ] Activation time < 3 seconds
- [ ] WebSocket connection < 2 seconds
- [ ] UI responsiveness during transitions
- [ ] Memory usage stability

## Success Criteria Summary
- [ ] All test scenarios pass
- [ ] No regression in existing functionality
- [ ] User experience smooth across all states
- [ ] Error scenarios handled gracefully
- [ ] Performance meets requirements
- [ ] Code is maintainable and well-documented

## Risk Assessment
**High Risk**:
- WebSocket connection failures
- Backend API unavailability
- State synchronization issues

**Medium Risk**:
- UI state management complexity
- Error handling edge cases
- Performance under load

**Low Risk**:
- Responsive design issues
- Minor UI inconsistencies

## Test Data Requirements
- Valid station data in Firestore
- Test user accounts
- Mock backend responses for error scenarios
- Various device/screen sizes for responsive testing

## Tools Required
- Browser developer tools (Network, Console, Application)
- WebSocket debugging tools
- API testing tools (Postman/cURL)
- Screen recording for UI testing
- Performance monitoring tools
