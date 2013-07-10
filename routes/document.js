var Document = require('../models/document.js').Document;

/*
 * The functions in this file are based on '/routes/project.js'.
 */

/**
 * GET documents listing.
 *
 * FIXME: Move to Project? 
 *
 */
exports.list = function (req, res) {
    Document.find({}, function (err, docs) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else {
            res.send({"documents": docs});
        }
    });
};

exports.create = function (req, res) {
    var document = new Document({
        // TODO: Add creating user
        name:      req.body.name,
        text:      req.body.text,
        projectId: req.params.projectId,
        members: [
            {userId: req.user._id, access: ["admin"]}
        ]
    });
	
    document.save(function (err) {
        if (err) {
            // return error
            res.send({"errorMessage": "Database problem"}, 400);
        } else {
            res.send({document: document});
        }
    });
}

exports.createFolder = function (req, res) {
    // TODO: implement
}

exports.archive = function (req, res) {
    // TODO: implement
}

exports.compile = function (req, res) {
    // TODO: implement
}

exports.rearrange = function (req, res) {
    // TODO: implement
}

exports.rename = function (req, res) {
	// TODO: implement
}

exports.delete = function (req, res) {
    // TODO: implement
}
