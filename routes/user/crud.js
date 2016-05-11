/**
 * Created by Ignat on 5/10/2016.
 */
var UserModel = require('../../models/userOperations.js');

module.exports = {
    signIn: signIn,
    remove: remove,
    update: update,
    search: search


};


function signIn(request, response){
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
    UserModel.deleteUser(request.body._id, function(err){
        if(err){ response.status(500).json({ message: err.message }); }
        else{ response.status(200).send(); }
    });
};

function update(request, response){
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
    User.universalUserSearch(request.query.criteria, request.query.value,
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