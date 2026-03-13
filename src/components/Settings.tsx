"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

const AgencyManagement = dynamic(() => import("@/components/AgencyManagement"), { ssr: false });

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Settings</CardTitle>
          <CardDescription>General application preferences</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">
            Settings will be available here.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Agency Settings</CardTitle>
          <CardDescription>Manage agencies, users, and related configuration</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <AgencyManagement />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;


