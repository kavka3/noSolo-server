/**
 * Created by Ignat on 5/10/2016.
 */


module.exports = function(request, response){
    var productionServer1 = 'https://salty-peak-2515.herokuapp.com/',
        productionServer2 = 'https://floating-depths-2240.herokuapp.com/',
        developmentServer = 'https://nosolodev.herokuapp.com/',
        localHost = 'http://localhost:5000/',
        redirectProduction = 'https://tranquil-shore-8222.herokuapp.com/',
        redirectDev = 'https://redirect-dev.herokuapp.com/',
        redirectLocal = 'http://localhost:11000/'
        ;
    if(request.query.appStatus == 'development'){
        if(request.query.isLocal == 'true'){
            response.json({ serverURL: localHost, redirectURL: redirectLocal });
        }
        else{
            response.json({ serverURL: developmentServer, redirectURL: redirectProduction });
        }

    }
    else{
        var version = parseInt(request.query.appVersion);
        if(request.query.isLocal == 'true'){
            response.json({ serverURL: localHost, redirectURL: redirectLocal });
        }
        else if(version == 11){
            response.json({ serverURL: productionServer1, redirectURL: redirectDev });
        }
        else{
            response.json({ serverURL: productionServer2, redirectURL: redirectDev })
        }
    }
};