'use strict';
// Defense in depth: the student independently validates all preview payloads.
function validPreview(cmd, sessionId, now=Date.now()) {
 if (!cmd || cmd.sessionId !== sessionId || typeof sessionId !== 'string' || !sessionId || !Number.isSafeInteger(cmd.sequence) || cmd.sequence < 1) return false;
 if (!Number.isSafeInteger(cmd.at) || cmd.at > now + 2000 || now - cmd.at > 10000) return false;
 if (cmd.type === 'pointer-preview') return Number.isInteger(cmd.x) && Number.isInteger(cmd.y) && cmd.x >= 0 && cmd.x <= 10000 && cmd.y >= 0 && cmd.y <= 10000;
 if (cmd.type === 'key-preview') return typeof cmd.key === 'string' && /^[A-Za-z0-9]$/.test(cmd.key);
 return false;
}
function acceptPreview(queue, cmd, sessionId, now=Date.now()) {
 if (!validPreview(cmd,sessionId,now) || queue.some(x=>x.sessionId===sessionId && x.sequence===cmd.sequence)) return false;
 // Monotonic sequence, including after a queue trim.
 if (queue.length && cmd.sequence <= queue[queue.length-1].sequence) return false;
 return true;
}
module.exports={validPreview,acceptPreview};
