const test=require('node:test');const assert=require('node:assert/strict');const g=require('../public/m108-groups');
for(const [id,n] of [['PC-01',1],['PC-10',10],['Lab21',21],['PC',null],['PC-0',null],['PC-10000',null]])test('seat '+id,()=>assert.equal(g.seatNumber(id),n));
for(const [id,size,key] of [['PC-01',5,'1'],['PC-05',5,'1'],['PC-06',5,'2'],['PC-21',7,'3'],['Mac',10,'unassigned']])test('group '+id,()=>assert.equal(g.groupOf({id},size),key));
test('reject bad group size',()=>assert.throws(()=>g.groupOf({id:'PC-01'},0)));
test('invalid list returns empty',()=>assert.deepEqual(g.group(null,5),[]));
test('group order and aggregate counts',()=>{const data=[{id:'PC-11',approved:true,online:false},{id:'PC-01',approved:true,online:true},{id:'Other',approved:false,online:true},{id:'PC-06',approved:false,online:false}];const groups=g.group(data,5);assert.deepEqual(groups.map(x=>x.key),['1','2','3','unassigned']);assert.equal(groups[0].online,1);assert.equal(groups[1].attention,1);assert.equal(groups[3].attention,1);});
test('group does not mutate source',()=>{const data=[{id:'PC-02',online:true}];const copy=JSON.stringify(data);g.group(data,5);assert.equal(JSON.stringify(data),copy);});
