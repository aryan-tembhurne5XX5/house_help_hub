
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getUserProfile, updateUserProfile } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get user ID from localStorage
  const userId = parseInt(localStorage.getItem('userId') || '0');
  
  // Redirect if not logged in as user
  useEffect(() => {
    if (!userId || localStorage.getItem('userType') !== 'user') {
      toast.error("Please login as a user first");
      navigate("/auth");
    }
  }, [userId, navigate]);
  
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      try {
        const response = await getUserProfile(userId);
        return response.data;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 30000,
  });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
    }
  }, [profile]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      const { email, ...updateData } = formData; // Don't update email
      const response = await updateUserProfile(userId, updateData);
      
      if (response.data) {
        // Update localStorage with new data
        localStorage.setItem('userName', response.data.name);
        if (response.data.profile_pic) {
          localStorage.setItem('userProfilePic', response.data.profile_pic);
        }
        
        toast.success('Profile updated successfully');
        refetch();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your profile...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle>Error</CardTitle>
                <CardDescription>Failed to load your profile</CardDescription>
              </CardHeader>
              <CardContent>
                <p>There was an error loading your profile details. Please try again later.</p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => refetch()}>Retry</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">User Profile</h1>
          
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center">
                  <Avatar className="h-16 w-16 mr-4">
                    <AvatarImage src={profile?.profile_pic} />
                    <AvatarFallback>{profile?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{profile?.name}</CardTitle>
                    <CardDescription className="mt-1">User Account</CardDescription>
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
                    value={formData.email}
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
                    value={formData.name}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    disabled={!isEditing || isSaving}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    disabled={!isEditing || isSaving}
                    placeholder={isEditing ? "Enter your phone number" : "No phone number added"}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    readOnly={!isEditing}
                    disabled={!isEditing || isSaving}
                    placeholder={isEditing ? "Enter your address" : "No address added"}
                    rows={3}
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
        </div>
      </div>
    </Layout>
  );
}
