"use client";

import React, { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const me = await authApi.me();
        setProfile(me);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>View your account details</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading...</div>}
        {error && !loading && <div className="text-destructive">{error}</div>}
        {profile && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.profileImage || undefined} alt="Profile" />
                <AvatarFallback>
                  {`${(profile.firstName || "").charAt(0)}${(profile.lastName || "").charAt(0)}`.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-semibold">{`${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.username || profile.email}</div>
                <div className="text-sm text-muted-foreground">{profile.email}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">


               <div>
                <div className="text-muted-foreground">First Name</div>
                <div className="font-medium">{profile.firstName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">LastName</div>
                <div className="font-medium">{profile.lastName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{profile.email}</div>
              </div>
                <div>
                <div className="text-muted-foreground">Role</div>
                <div className="font-medium">{profile.role}</div>
              </div>
             
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfile;


