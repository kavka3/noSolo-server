/**
 * Created by Ignat on 5/10/2016.
 */
module.exports = {
    signIn: signIn,
    remove: remove,
    update: update,
    search: search
};

function signIn(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.signIn(request.body, function(err, result, isSignUp){
        if(err){ response.status(500).json({ message: err.message }); }
        else{ response.json({
            result: "success",
            data: result,
            isSignUp: isSignUp
        });
        }
    });
};

function remove(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.deleteUser(request.body._id, function(err){
        if(err){ response.status(500).json({ message: err.message }); }
        else{ response.status(200).send(); }
    });
};

function update(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.universalUserUpdate(request.body, function(err, updatedUser){
        if(err){ response.status(500).json({ message: err.message }); }
        else{
            response.json({
                result: 'success',
                data: updatedUser
            });
        }
    });
};

function search(request, response){
    var UserModel = require('../../models/userOperations.js');
    UserModel.universalUserSearch(request.query.criteria, request.query.value,
        function(err, found){
            if(err){ response.status(500).json({ message: err.message }); }
            else{
                response.json({
                    result: 'success',
                    data: found
                });
            }
        });
};