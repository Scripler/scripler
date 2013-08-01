/**
 * Does the user have access to the entity, e.g. project or document?
 */
exports.hasAccessToEntity = function (user, entity, access) {
    access = access || "admin";
    var memberObj = getEmbeddedDocument(entity.members, "userId", user._id.toString()) || {};
    var accessArray = memberObj.access || [];
    return accessArray.indexOf(access) >= 0;
}

function getEmbeddedDocument(arr, queryField, search) {
    var len = arr.length;
    while (len--) {
        if (arr[len][queryField] === search) {
            return arr[len];
        }
    }
}