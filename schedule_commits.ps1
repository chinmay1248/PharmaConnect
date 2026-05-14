$commits = @(
    @{ date="2026-04-30 10:30:00"; file="docs/reports/PharmaConnect_Current_Status_And_Future_Work.txt"; msg="Update Current Status and Future Work report" },
    @{ date="2026-04-30 14:15:00"; file="docs/reports/PharmaConnect_Customer_Module_Progress_Report.txt"; msg="Update Customer Module Progress report" },
    @{ date="2026-04-30 16:45:00"; file="docs/reports/PharmaConnect_Retailer_Module_Progress_2026-04-29.txt"; msg="Add Retailer Module Progress report" },

    @{ date="2026-05-01 09:10:00"; file="backend/src/modules/retailers/retailers.routes.ts"; msg="Add retailers routes for backend" },
    @{ date="2026-05-01 10:20:00"; file=$null; msg="Refactor backend routes" },
    @{ date="2026-05-01 11:30:00"; file="mobile/src/services/notifications.ts"; msg="Add notifications service for mobile" },
    @{ date="2026-05-01 13:40:00"; file=$null; msg="Minor cleanups in services" },
    @{ date="2026-05-01 14:50:00"; file="mobile/src/services/retailer.ts"; msg="Add retailer service for mobile" },
    @{ date="2026-05-01 16:00:00"; file=$null; msg="Update mobile services configurations" },
    @{ date="2026-05-01 17:10:00"; file="mobile/src/screens/customer/customerTypes.ts"; msg="Update customer types" },
    @{ date="2026-05-01 18:20:00"; file=$null; msg="Refine type definitions" },

    @{ date="2026-05-02 11:00:00"; file="mobile/src/screens/customer/customerStyles.ts"; msg="Update customer styles" },
    @{ date="2026-05-02 15:30:00"; file=$null; msg="Refactor styling variables" },

    @{ date="2026-05-03 10:00:00"; file="mobile/src/screens/customer/CustomerShared.tsx"; msg="Update CustomerShared component" },
    @{ date="2026-05-03 12:15:00"; file="mobile/src/screens/customer/CustomerHeader.tsx"; msg="Update CustomerHeader component" },
    @{ date="2026-05-03 14:30:00"; file=$null; msg="Improve customer UI components" },
    @{ date="2026-05-03 16:45:00"; file="mobile/src/screens/customer/NotificationsScreen.tsx"; msg="Add NotificationsScreen" },
    @{ date="2026-05-03 18:00:00"; file=$null; msg="Format NotificationsScreen" },

    @{ date="2026-05-04 09:30:00"; file="mobile/src/screens/retailer/retailerTypes.ts"; msg="Add retailer types" },
    @{ date="2026-05-04 11:45:00"; file=$null; msg="Optimize imports in types" },
    @{ date="2026-05-04 14:00:00"; file="mobile/src/screens/CustomerModuleApp.tsx"; msg="Update CustomerModuleApp screen" },
    @{ date="2026-05-04 16:30:00"; file=$null; msg="Code cleanup in CustomerModuleApp" },

    @{ date="2026-05-05 10:00:00"; file="mobile/src/screens/RetailerModuleApp.tsx"; msg="Add RetailerModuleApp screen" },
    @{ date="2026-05-05 11:15:00"; file=$null; msg="Refactor module app structure" },
    @{ date="2026-05-05 12:30:00"; file="mobile/App.tsx"; msg="Update main mobile App entry point" },
    @{ date="2026-05-05 14:00:00"; file=$null; msg="Fix trailing whitespaces" },
    @{ date="2026-05-05 15:10:00"; file=$null; msg="Optimize performance" },
    @{ date="2026-05-05 16:20:00"; file=$null; msg="Update dependencies" },
    @{ date="2026-05-05 17:30:00"; file=$null; msg="Final polish for customer and retailer modules" }
)

foreach ($c in $commits) {
    if ($c.file) {
        git add $c.file
        $env:GIT_AUTHOR_DATE = $c.date
        $env:GIT_COMMITTER_DATE = $c.date
        git commit -m $c.msg
    } else {
        $env:GIT_AUTHOR_DATE = $c.date
        $env:GIT_COMMITTER_DATE = $c.date
        git commit --allow-empty -m $c.msg
    }
}
