import assert from 'node:assert/strict'
import {mobileMapLabel} from './mobileMapLabel.ts'

assert.equal(mobileMapLabel('日本','3/3 在线',true).text,'日本 · 3/3 在线')
const long=mobileMapLabel('A very long international country name','12/100 online',true)
assert.ok(long.text.endsWith(' · 12/100 online'))
assert.ok(long.text.includes('…'))
assert.ok(long.width<=190)
assert.equal(mobileMapLabel('日本','3/3 在线',false).text,'日本')

const narrow=mobileMapLabel('日本','12345678901234567890/100 online',true,90)
assert.ok(narrow.text.endsWith(' · 12345678901234567890/100 online'))
assert.ok(narrow.width>90,'an unplaceable full count must retain its true width')
