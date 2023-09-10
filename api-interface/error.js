// https://github.com/TypeStrong/ts-node/issues/2026
// There is a bug with the logging in ts-node, temporary solution
// TODO: Remove it as soon as this issue will be closed
import { hasUncaughtExceptionCaptureCallback, setUncaughtExceptionCaptureCallback } from 'node:process';
if (!hasUncaughtExceptionCaptureCallback) {
    setUncaughtExceptionCaptureCallback(console.error);
}
