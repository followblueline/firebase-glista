// Retrieve a CodeMirror Instance via native JavaScript.
// target: selector
// getCodeMirrorNative('#formContent').getDoc().getValue() - returns instance content
function getCodeMirrorNative(target) {
    var _target = target;
    if (typeof _target === 'string') {
        _target = document.querySelector(_target);
    }
    if (_target === null || !_target.tagName === undefined) {
        throw new Error('Element does not reference a CodeMirror instance.');
    }

    if (_target.className.indexOf('CodeMirror') > -1) {
        return _target.CodeMirror;
    }

    if (_target.tagName === 'TEXTAREA') {
        return _target.nextSibling.CodeMirror;
    }

    return null;
};

// shorten text
function truncateText (str, n){
    return (str.length > n) ? str.substr(0, n-1) + '...' : str;
}
