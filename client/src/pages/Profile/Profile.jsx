import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Envelope, Shield, Buildings, LockKey } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.firstName || user?.name || 'User';
  const schoolName = user?.school?.name || user?.school || '—';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">My Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">View and manage your account details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} size="lg" />
            <div>
              <p className="text-lg font-semibold text-zinc-900">{displayName}</p>
              <p className="text-sm text-zinc-500 capitalize">{user?.role || 'User'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full name"
              value={displayName}
              readOnly
              startIcon={<User size={18} />}
            />
            <Input
              label="Email"
              value={user?.email || ''}
              readOnly
              startIcon={<Envelope size={18} />}
            />
            <Input
              label="Role"
              value={user?.role || ''}
              readOnly
              startIcon={<Shield size={18} />}
            />
            <Input
              label="School"
              value={schoolName}
              readOnly
              startIcon={<Buildings size={18} />}
            />
          </div>

          <div className="border-t border-zinc-100 pt-5">
            <Button
              variant="outline"
              onClick={() => alert('Change password feature coming soon')}
            >
              <LockKey size={18} />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    </div>
  );
};

export default Profile;
