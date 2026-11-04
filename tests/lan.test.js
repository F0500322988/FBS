'use strict';const test=require('node:test'),assert=require('node:assert/strict');const {localIPv4,signature,safeEqual}=require('../lan');
test('returns IP list',()=>assert.ok(Array.isArray(localIPv4())));
test('signatures are verified and tampering fails',()=>{const s=signature('key','payload');assert.ok(safeEqual(s,signature('key','payload')));assert.equal(safeEqual(s,signature('key','tampered')),false);});
