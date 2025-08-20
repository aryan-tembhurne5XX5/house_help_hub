
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings } from "lucide-react";

interface ProfileAvatarProps {
  userType: 'user' | 'worker' | 'admin' | null;
}

export function ProfileAvatar({ userType }: ProfileAvatarProps) {
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('');
  
  useEffect(() => {
    if (userType) {
      const storedName = localStorage.getItem(`${userType}Name`) || '';
      const storedAvatar = localStorage.getItem(`${userType}ProfilePic`) || '';
      
      setName(storedName);
      setAvatar(storedAvatar);
    }
  }, [userType]);
  
  if (!userType) return null;
  
  const handleLogout = () => {
    // Clear all auth related localStorage items
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
    localStorage.removeItem('workerId');
    localStorage.removeItem('adminId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('workerName');
    localStorage.removeItem('adminName');
    localStorage.removeItem('userProfilePic');
    localStorage.removeItem('workerProfilePic');
    localStorage.removeItem('adminProfilePic');
    
    // Redirect to auth page
    navigate('/auth');
  };
  
  const handleViewProfile = () => {
    if (userType === 'user') {
      navigate('/user/profile');
    } else if (userType === 'worker') {
      navigate('/worker/profile');
    } else if (userType === 'admin') {
      navigate('/admin/profile');
    }
  };
  
  const handleGoToDashboard = () => {
    if (userType === 'user') {
      navigate('/user/dashboard');
    } else if (userType === 'worker') {
      navigate('/worker/dashboard');
    } else if (userType === 'admin') {
      navigate('/admin/dashboard');
    }
  };
  
  // Get first name or first character of name for the avatar fallback
  const getNameInitials = () => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 border border-gray-200">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback>{getNameInitials()}</AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userType.charAt(0).toUpperCase() + userType.slice(1)} Account
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleGoToDashboard}>
            <User className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewProfile}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
