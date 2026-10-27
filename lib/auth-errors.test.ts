import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isUnverified} from './auth-errors.ts';
test('origin and other forbidden errors never trigger the email verification screen',()=>{
 for(const message of ['Invalid origin','Invalid domain','Access denied','Email verification service unavailable'])assert.equal(isUnverified({status:403,message}),false);
 assert.equal(isUnverified({status:403}),false);
});
test('only actual unverified email errors trigger verification',()=>{
 assert.equal(isUnverified({code:'EMAIL_NOT_VERIFIED'}),true);
 assert.equal(isUnverified({message:'Email is not verified',status:403}),true);
 assert.equal(isUnverified({message:'Verify your email first'}),true);
});
