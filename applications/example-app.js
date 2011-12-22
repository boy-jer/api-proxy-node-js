util = require("util");

module.exports.applications =
[
{
    app_name: 'Example'
		, app_id: 'exmaple-app-v0.9'
		, app_secret: 'mypassword'
		, apikey: '<TRIAL API KEY HERE>' //'your apikey here'
	    , apikey_full: '<FULL API KEY HERE>'
    	, app_config: {
        trial: true,
        upgrade_url: "https://my.shop.com/shop_page"
    }
		, receipt_validate: function (receipt) {
        // 1-MUS111020-4385-39117-c6sFPkNKQo5L/qeMh0by0x/V33/R5Ny25nywZPLkfjc=
        // base64 does not include "-" signs
        // sanity checks

        console.log("receipt is " + receipt);

        var valid_license = false;

        //
        // validation code here
        //

        if (valid_license) {
            var result = this.clone();
            result.apikey = result.apikey_full;
            result.app_config.trial = false;
        }
        else
            return this;
    }
        , facebook: {
        app_id: 131314396964274
    }
        , sign_calls: false
        , headers: {
        "Access-Control-Allow-Origin": "*"
    }
}
];