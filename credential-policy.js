'use strict';
const normalizeDigits = value => typeof value === 'string' ? value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, c => String(c.charCodeAt(0) - (c.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660))) : value;
const isPin = value => typeof value === 'string' && /^[0-9]{3,8}$/.test(value);
const storedKey = value => isPin(value) || (typeof value === 'string' && value.length >= 16);
const storedPassword = value => isPin(value) || (typeof value === 'string' && value.length >= 12);
module.exports = { normalizeDigits, isPin, storedKey, storedPassword };
