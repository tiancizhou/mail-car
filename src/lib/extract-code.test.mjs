import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync(new URL('./extract-code.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } },
).outputText, context);
const codes = (html, text = '') => Array.from(
  context.exports.extractVerificationCodes(html, text), item => item.code,
);

for (const [name, html, text, expected] of [
  ['English heading must not suppress real code', '<h1>Your verification code</h1><p>123456</p>', '', ['123456']],
  ['passcode label is not itself a code', '<p>Your passcode</p><p>654321</p>', '', ['654321']],
  ['ordinary English after label', '', 'Your code expires soon.\n123456', ['123456']],
  ['English connector', '', 'Your verification code is: 012345', ['012345']],
  ['Chinese connector and nested HTML', '<p>验证码为：<b>123456</b></p>', '', ['123456']],
  ['entities between label and token', '<p>OTP:&nbsp;&#49;23456</p>', '', ['123456']],
  ['mixed alphanumeric code', '', 'Login code: A1b2C3', ['A1b2C3']],
  ['long tokens cannot be truncated', '', 'OTP: 123456789 code: A123456789', []],
  ['word boundaries on labels', '', 'shipping1234', []],
  ['styled English heading', '<h1 style="font-size: 32px">Welcome</h1><div>123456</div>', '', ['123456']],
  ['ignore attributes scripts styles comments', '<style>.x{color:123456}</style><script>OTP: 234567</script><!-- OTP: 345678 --><a href="/code:456789">link</a>', '', []],
  ['single quoted styled mixed code', "<div style='letter-spacing: 4px'>A1B2C3</div>", '', ['A1B2C3']],
  ['plain text only code', '', '123456', ['123456']],
  ['deduplicate HTML and plain text', '<p>OTP: 123456</p>', 'OTP: 123456', ['123456']],
  ['no code in ordinary prose', '', 'Your verification code will arrive shortly', []],
]) {
  test(name, () => assert.deepEqual(codes(html, text), expected));
}
