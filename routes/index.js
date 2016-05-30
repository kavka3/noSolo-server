
//Test

module.exports = function(app){
    //returns user or create new one if not exists
    //TODO add user authentication and session management on sign in sign out and delete
    app.post('/signIn', require('./user/crud.js').signIn);

    app.get('/user_un_search', require('./user/crud.js').search);

    app.post('/user_update', require('./user/crud.js').update);

    app.post('/delete_user', require('./user/crud.js').remove);

    app.post('/user_join_activity', require('./user/model.js').enter);
    //user leaves activity
    app.post('/user_leave_activity',require('./user/model.js').leave);
    //creator removes user from activity
    app.post('/delete_member_from_activity', require('./user/model.js').removeUser);

    app.post('/device_register', require('./user/model.js').deviceRegister);

    app.post('/device_unregister', require('./user/model.js').deviceUnregister);

    app.post('/create_tag', require('./tag/crud.js').create);
    //returns all tags sorted by language
    app.post('/tag_dictionary', require('./tag/crud.js').dictionary);

    app.post('/create_activity', require('./activity/crud.js').create);

    app.get('/discover_activities', require('./activity/model.js').discover);

    app.post('/activity_update', require('./activity/crud.js').update);

    app.get('/activity_un_search', require('./activity/crud.js').search);

    app.post('/remove_activity', require('./activity/crud.js').remove);

    app.post('/fb_activities', require('./activity/create_fb'));

    app.post('/update_image', require('./activity/crud.js').updateImage);

    app.post('/invite', require('./activity/model.js').invite);

    app.post('/accept_invite', require('./activity/model.js').acceptInvite);

    app.post('/report_activity', require('./activity/model.js').report);

    app.post('/get_subscribe', require('./activity/model.js').subscribe);

    app.post('/minifyLink', require('./activity/model.js').minifyLink);
    //returns to app link to server and redirect server depends on app version
    app.get('/connection', require('./services/connection.js'));
   //returns reported activities
    app.get('/get_reports', require('./services/services.js').getReports);

    app.post('/proceed_report', require('./services/services.js').proceed);

    app.post('/reject_report', require('./services/services.js').reject);

    app.get('/command_dictionary', require('./services/services.js').commandDictionaryGet);

    app.post('/commandDictionary', require('./services/services.js').commandDictionaryPost);

    app.get('/command_base', require('./services/services.js').appCommandBase);

    app.post('/support_chat', require('./services/services.js').updateSupportChat);

    app.post('/admin_chat', require('./services/services.js').createSupportChat);

};
