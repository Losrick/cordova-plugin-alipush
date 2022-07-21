package com.blanktrack.alipush;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import com.alibaba.sdk.android.push.CloudPushService;
import com.alibaba.sdk.android.push.CommonCallback;
import com.alibaba.sdk.android.push.noonesdk.PushServiceFactory;
// import com.alibaba.sdk.android.push.register.GcmRegister;
import com.alibaba.sdk.android.push.register.MiPushRegister;
import com.alibaba.sdk.android.push.register.MeizuRegister;
import com.alibaba.sdk.android.push.register.OppoRegister;
import com.alibaba.sdk.android.push.register.VivoRegister;

import org.apache.cordova.*;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class AliPushPlugin extends CordovaPlugin {
    public static final String TAG = "AliPushPlugin";
    public static String CHANNEL = "1";
    private static CallbackContext pushContext;

    public static CallbackContext getCurrentCallbackContext() {
        return pushContext;
    }

    public static void initCloudChannel(Context applicationContext) {
        // 创建notificaiton channel
        createNotificationChannel(applicationContext);
        PushServiceFactory.init(applicationContext);
        final CloudPushService pushService = PushServiceFactory.getCloudPushService();
        pushService.register(applicationContext, new CommonCallback() {
            @Override
            public void onSuccess(String response) {
                Log.i(TAG, "init cloudchannel success 通道编号：" + CHANNEL);
            }

            @Override
            public void onFailed(String errorCode, String errorMessage) {
                Log.e(TAG, "init cloudchannel failed -- errorcode:" + errorCode + " -- errorMessage:" + errorMessage);
            }
        });
    }

    /**
     * 自Android 8.0（API Level 26）起，Android推出了NotificationChannel机制，
     * 旨在对通知进行分类管理。如果用户App的targetSdkVersion大于等于26，且并未设置NotificaitonChannel，那么创建的通知是不会弹出显示。
     */
    private static void createNotificationChannel(Context applicationContext) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mNotificationManager = (NotificationManager) applicationContext.getSystemService(
                    Context.NOTIFICATION_SERVICE);
            // 用户可以看到的通知渠道的名字。
            CharSequence name = "信息推送通道";

            // 用户可以看到的通知渠道的描述。
            String description = "用于推送的重要信息";
            int importance = NotificationManager.IMPORTANCE_MAX;
            NotificationChannel mChannel = new NotificationChannel(CHANNEL, name, importance);

            // 配置通知渠道的属性。
            mChannel.setDescription(description);
            // 设置通知出现时的闪灯（如果Android设备支持的话）。
            mChannel.enableLights(true);
            mChannel.setLightColor(Color.RED);
            // 设置通知出现时的震动（如果Android设备支持的话）。
            mChannel.enableVibration(true);
            mChannel.setVibrationPattern(new long[] { 100, 200, 300, 400, 500, 400, 300, 200, 400 });
            // 最后在notificationmanager中创建该通知渠道。
            mNotificationManager.createNotificationChannel(mChannel);
        }
    }

    @Override
    public boolean execute(final String action, final JSONArray args, final CallbackContext callbackContext)
            throws JSONException {
        CloudPushService service = PushServiceFactory.getCloudPushService();
        CommonCallback callback = new CommonCallback() {
            @Override
            public void onSuccess(String response) {
                callbackContext.success(response);
            }

            @Override
            public void onFailed(String errCode, String errMsg) {
                callbackContext.error(errMsg);
            }
        };
        switch (action) {
            case "_init":
            case "init": {
                Context applicationContext = cordova.getActivity().getApplicationContext();
                String HUAWEIID = preferences.getString("HUAWEIID", "");
                String CHANNEL = preferences.getString("CHANNEL", "");
                String OPPOKEY = preferences.getString("OPPOKEY", "");
                String OPPOSECRET = preferences.getString("OPPOSECRET", "");
                String MEIZUID = preferences.getString("MEIZUID", "");
                String MEIZUKEY = preferences.getString("MEIZUKEY", "");
                // String VIVOID = preferences.getString("VIVOID", "");
                // String VIVOKEY = preferences.getString("VIVOKEY", "");
                String MIID = preferences.getString("MIID", "");
                String MIKEY = preferences.getString("MIKEY", "");
                // String GCMSENDID = preferences.getString("GCMSENDID", "");
                // String GCMAPPID = preferences.getString("GCMAPPID", "");
                OppoRegister.register(applicationContext, OPPOKEY, OPPOSECRET);
                MeizuRegister.register(applicationContext, MEIZUID, MEIZUKEY);
                VivoRegister.register(applicationContext);
                MiPushRegister.register(applicationContext, MIID, MIKEY);
                MyHuaWeiRegister.register(applicationContext, HUAWEIID);
                // GcmRegister.register(applicationContext, GCMSENDID, GCMAPPID);
                SharedPreferences sharedPreferences = applicationContext.getSharedPreferences("aliNotiMsg",
                        Context.MODE_PRIVATE);
                String json = sharedPreferences.getString("msg", "");
                PluginResult result;
                if (!"".equals(json)) {
                    JSONObject object = new JSONObject(json);
                    object.put("eventType", "openNotification");
                    result = new PluginResult(PluginResult.Status.OK, object);
                    SharedPreferences.Editor editor = sharedPreferences.edit();
                    editor.clear();
                    editor.commit();
                } else {
                    result = new PluginResult(PluginResult.Status.OK);
                }
                pushContext = callbackContext;
                result.setKeepCallback(true);
                callbackContext.sendPluginResult(result);
                break;
            }
            case "getDeviceId": {
                callbackContext.success(service.getDeviceId());
                break;
            }
            case "bindAccount": {
                if (args.length() < 1) {
                    callbackContext.error("invalid arguments");
                } else {
                    String account = args.getString(0);
                    service.bindAccount(account, callback);
                }
                break;
            }
            case "unbindAccount": {
                service.unbindAccount(callback);
                break;
            }
            case "unbindTag":
            case "bindTag": {
                if (args.length() < 2) {
                    callbackContext.error("invalid arguments");
                } else {
                    int target = args.getInt(0);
                    JSONArray array = args.getJSONArray(1);
                    List<String> list = new ArrayList<>();
                    for (int i = 0; i < array.length(); i++) {
                        list.add(array.getString(i));
                    }
                    String alias = args.getString(2);
                    if ("bindTag".equals(action)) {
                        service.bindTag(target, list.toArray(new String[0]), alias, callback);
                    } else {
                        service.unbindTag(target, list.toArray(new String[0]), alias, callback);
                    }

                }
                break;
            }
            case "listTags": {
                service.listTags(CloudPushService.DEVICE_TARGET, callback);
                break;
            }
            case "addAlias": {
                service.addAlias(args.getString(0), callback);
                break;
            }
            case "removeAlias": {
                service.removeAlias(args.getString(0), callback);
                break;
            }
            case "listAliases": {
                service.listAliases(callback);
                break;
            }
            case "bindPhoneNumber": {
                service.bindPhoneNumber(args.getString(0), callback);
                break;
            }
            case "unbindPhoneNumber": {
                service.unbindPhoneNumber(callback);
                break;
            }
        }

        return true;
    }

}
