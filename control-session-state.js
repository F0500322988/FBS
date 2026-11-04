// Pure state transitions for student-side control polling. No input execution.
function initialState(){return {session:null,stoppedIds:[],revision:0,stopReceipt:null,previewCommands:[]};}
function applyPoll(state, next, requestRevision, now=Date.now()){
  // Responses started before a local stop/deny must not revive that session.
  if(requestRevision!==state.revision)return state;
  const allowed=next && ['pending-native-consent','consented-no-input'].includes(next.status) && Number.isFinite(next.expiresAt) && next.expiresAt>now && !state.stoppedIds.includes(next.sessionId);
  const session=allowed?next:null;
  return {...state,session,previewCommands:session?.sessionId===state.session?.sessionId?state.previewCommands:[]};
}
function localClose(state, sessionId, reason='stop', now=Date.now()){
  if(!state.session||state.session.sessionId!==sessionId)return state;
  return {...state,session:null,previewCommands:[],revision:state.revision+1,
    stoppedIds:[...state.stoppedIds.filter(x=>x!==sessionId),sessionId].slice(-128),
    stopReceipt:reason==='stop'?{sessionId,state:'submitted',at:now}:state.stopReceipt};
}
function confirmStop(state,sessionId,now=Date.now()){
  return state.stopReceipt?.sessionId===sessionId?{...state,stopReceipt:{sessionId,state:'confirmed',at:now}}:state;
}
module.exports={initialState,applyPoll,localClose,confirmStop};
