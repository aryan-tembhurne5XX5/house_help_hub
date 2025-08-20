
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get admin ID from localStorage
  const adminId = parseInt(localStorage.getItem('adminId') || '0');
  
  // Redirect if not logged in as admin
  useEffect(() => {
    if (!adminId || localStorage.getItem('userType') !== 'admin') {
      toast.error("Please login as an admin first");
      navigate("/auth");
    }
  }, [adminId, navigate]);
  
  const [profileData, setProfileData] = useState({
    name: localStorage.getItem('adminName') || '',
    email: localStorage.getItem('adminEmail') || '',
    profilePic: localStorage.getItem('adminProfilePic') || '',
  });
  
  // Mock handleSave for admin
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // In a real app, this would call an API
      // For now, just update localStorage
      localStorage.setItem('adminName', profileData.name);
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Profile</h1>
          
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center">
                  <Avatar className="h-16 w-16 mr-4">
                    <AvatarImage src={profileData.profilePic} />
                    <AvatarFallback>{profileData.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{profileData.name}</CardTitle>
                    <CardDescription className="mt-1">Admin Account</CardDescription>
                  </div>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={profileData.email}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    disabled={!isEditing || isSaving}
                  />
                </div>
              </div>
            </CardContent>
            
            {isEditing && (
              <CardFooter>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
          
          <div className="mt-6">
            <Button onClick={() => navigate('/admin/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
