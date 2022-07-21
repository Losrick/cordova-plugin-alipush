package com.blanktrack.alipush;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;

import com.alibaba.sdk.android.push.huawei.HuaWeiRegister;
import com.alibaba.sdk.android.push.impl.HuaweiMsgParseImpl;
import com.alibaba.sdk.android.push.register.ThirdPushManager;
import com.alibaba.sdk.android.push.utils.SysUtils;
import com.alibaba.sdk.android.push.utils.ThreadUtil;
import com.huawei.hms.aaid.HmsInstanceId;
import com.huawei.hms.common.ApiException;
import com.taobao.accs.utl.ALog;

import java.lang.reflect.Method;

public class MyHuaWeiRegister extends HuaWeiRegister {

    private static final String TAG = "MPS:HuaWeiRegister";
    public static boolean isChannelRegister = false;
    public static String HUAWEI_ID = "";

    public MyHuaWeiRegister() {
    }

    public static boolean register(Context applicationContext, String huaweiId) {
        MyHuaWeiRegister.HUAWEI_ID = huaweiId;
        return registerBundle(applicationContext, false);
    }

    public static boolean registerBundle(final Context applicationContext, boolean channelRegister) {
        try {
            isChannelRegister = channelRegister;
            if (!isChannelRegister && !SysUtils.isMainProcess(applicationContext)) {
                ALog.e("MPS:HuaWeiRegister", "register not in main process, return", new Object[0]);
                return false;
            }

            if (checkDevice() && Build.VERSION.SDK_INT >= 17) {
                ThirdPushManager.registerImpl(new HuaweiMsgParseImpl());
                Handler handler = new Handler(Looper.getMainLooper());
                handler.postDelayed(new Runnable() {
                    public void run() {
                        ALog.i("MPS:HuaWeiRegister", "register begin isChannel:" + MyHuaWeiRegister.isChannelRegister,
                                new Object[0]);
                        MyHuaWeiRegister.getToken(applicationContext.getApplicationContext());
                    }
                }, 5000L);
                return true;
            }

            ALog.i("MPS:HuaWeiRegister", "register checkDevice false", new Object[0]);
        } catch (Throwable var3) {
            ALog.e("MPS:HuaWeiRegister", "register", var3, new Object[0]);
        }

        return false;
    }

    private static void getToken(final Context context) {
        ThreadUtil.getExecutor().execute(new Runnable() {
            public void run() {
                try {
                    ApplicationInfo appInfo = context.getPackageManager().getApplicationInfo(context.getPackageName(),
                            128);
                    // String value = appInfo.metaData.getString("HUAWEIID");
                    String appId = "";
                    if (!TextUtils.isEmpty(HUAWEI_ID)) {
                        appId = HUAWEI_ID.replace("appid=", "");
                    }

                    String token;
                    if (TextUtils.isEmpty(appId)) {
                        token = HmsInstanceId.getInstance(context).getToken();
                    } else {
                        token = HmsInstanceId.getInstance(context).getToken(appId, "HCM");
                    }

                    ALog.i("MPS:HuaWeiRegister", "onToken", new Object[] { "appId", appId, "token", token });
                    if (!TextUtils.isEmpty(token)) {
                        try {
                            ThirdPushManager.reportToken(context,
                                    ThirdPushManager.ThirdPushReportKeyword.HUAWEI.thirdTokenKeyword, token,
                                    "6.3.0.304");
                        } catch (Exception var7) {
                            var7.printStackTrace();
                        }
                    }
                } catch (Throwable var8) {
                    if (var8 instanceof ApiException) {
                        ALog.e("MPS:HuaWeiRegister", "getToken failed. " + ((ApiException) var8).getStatusCode(), var8,
                                new Object[0]);
                    } else {
                        ALog.e("MPS:HuaWeiRegister", "getToken failed. " + var8.getMessage(), var8, new Object[0]);
                    }

                    try {
                        ThirdPushManager.reportToken(context,
                                ThirdPushManager.ThirdPushReportKeyword.HUAWEI.thirdTokenKeyword, "", "6.3.0.304");
                    } catch (Exception var6) {
                        var6.printStackTrace();
                    }
                }

            }
        });
    }

    private static boolean checkDevice() {
        boolean result = false;
        if (Build.BRAND.equalsIgnoreCase("huawei") || Build.BRAND.equalsIgnoreCase("honor")) {
            result = true;
        }

        if (!result) {
            String emuiVersion = getProp("ro.build.version.emui");
            String harmonyVersion = getProp("hw_sc.build.platform.version");
            result = !TextUtils.isEmpty(emuiVersion) || !TextUtils.isEmpty(harmonyVersion);
        }

        return result;
    }

    private static String getProp(String key) {
        String value = "";

        try {
            Class<?> cls = Class.forName("android.os.SystemProperties");
            Method get = cls.getDeclaredMethod("get", String.class);
            value = (String) get.invoke((Object) null, key);
        } catch (Throwable var4) {
        }

        return value;
    }

}
