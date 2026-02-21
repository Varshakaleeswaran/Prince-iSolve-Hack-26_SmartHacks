import { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, Loader2, Save } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PhoneInput } from '@/components/ui/phone-input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>('dark');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
      setPhoneCountryCode(profile.phone_country_code || '+91');
      setThemePreference((profile.theme_preference as 'light' | 'dark') || 'dark');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themePreference);
  }, [themePreference]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        phone_country_code: phoneCountryCode,
        theme_preference: themePreference,
      })
      .eq('id', user.id);
    
    if (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to save changes', 
        variant: 'destructive' 
      });
    } else {
      await refreshProfile();
      toast({ 
        title: 'Success', 
        description: 'Changes saved successfully' 
      });
    }
    
    setIsSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ 
        title: 'Error', 
        description: 'New passwords do not match', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({ 
        title: 'Error', 
        description: 'Password must be at least 6 characters', 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsChangingPassword(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'Success', 
        description: 'Password updated successfully' 
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
    
    setIsChangingPassword(false);
  };

  const handleThemeToggle = async (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setThemePreference(newTheme);
    
    // Immediately save to database
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>

        {/* Profile Section */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={email}
                  disabled
                  className="mt-1 opacity-50" 
                />
              </div>
            </div>
            <div>
              <Label>Phone Number</Label>
              <PhoneInput
                value={phoneNumber}
                countryCode={phoneCountryCode}
                onValueChange={setPhoneNumber}
                onCountryCodeChange={setPhoneCountryCode}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your complaints</p>
              </div>
              <Switch 
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get instant alerts on your device</p>
              </div>
              <Switch 
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SLA Breach Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when deadlines are missed</p>
              </div>
              <Switch 
                checked={slaAlerts}
                onCheckedChange={setSlaAlerts}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Security</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input 
                id="current-password" 
                type="password" 
                className="mt-1"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password" 
                className="mt-1"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                className="mt-1"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUpdatePassword} 
              disabled={isChangingPassword || !newPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Appearance</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant={themePreference === 'light' ? 'default' : 'outline'}
                onClick={() => handleThemeToggle(false)}
                className="flex-1"
              >
                ☀️ Light
              </Button>
              <Button
                type="button"
                variant={themePreference === 'dark' ? 'default' : 'outline'}
                onClick={() => handleThemeToggle(true)}
                className="flex-1"
              >
                🌙 Dark
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
