
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginUser, loginWorker, loginAdmin, registerUser, registerWorker } from "@/utils/api";
import { Loader2 } from "lucide-react";

// Define schemas for form validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

const registerWorkerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number is required and must be at least 10 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterUserFormData = z.infer<typeof registerUserSchema>;
type RegisterWorkerFormData = z.infer<typeof registerWorkerSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [userType, setUserType] = useState<"user" | "worker" | "admin">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register User form
  const registerUserForm = useForm<RegisterUserFormData>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  // Register Worker form
  const registerWorkerForm = useForm<RegisterWorkerFormData>({
    resolver: zodResolver(registerWorkerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  // Handle Login
  const onLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      let response;
      
      if (userType === "user") {
        response = await loginUser({
          email: data.email,
          password: data.password
        });
        const userData = response.data;
        
        localStorage.setItem("userType", "user");
        localStorage.setItem("userId", userData.user_id);
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userEmail", userData.email);
        localStorage.setItem("userProfilePic", userData.profile_pic || "");
        
        if (userData.phone) localStorage.setItem("userPhone", userData.phone);
        if (userData.address) localStorage.setItem("userAddress", userData.address);
        
        toast.success(`Welcome back, ${userData.name}!`);
        navigate("/user/dashboard");
      } else if (userType === "worker") {
        response = await loginWorker({
          email: data.email,
          password: data.password
        });
        const workerData = response.data;
        
        localStorage.setItem("userType", "worker");
        localStorage.setItem("workerId", workerData.worker_id);
        localStorage.setItem("workerName", workerData.name);
        localStorage.setItem("workerEmail", workerData.email);
        localStorage.setItem("workerPhone", workerData.phone);
        localStorage.setItem("workerProfilePic", workerData.profile_pic || "");
        
        toast.success(`Welcome back, ${workerData.name}!`);
        navigate("/worker/dashboard");
      } else if (userType === "admin") {
        response = await loginAdmin({
          email: data.email,
          password: data.password
        });
        const adminData = response.data;
        
        localStorage.setItem("userType", "admin");
        localStorage.setItem("adminId", adminData.admin_id);
        localStorage.setItem("adminName", adminData.name);
        localStorage.setItem("adminEmail", adminData.email);
        localStorage.setItem("adminProfilePic", adminData.profile_pic || "");
        
        toast.success(`Welcome back, Admin ${adminData.name}!`);
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMsg = error.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle User Registration
  const onRegisterUser = async (data: RegisterUserFormData) => {
    setIsSubmitting(true);
    try {
      const response = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone
      });
      const userData = response.data;
      
      localStorage.setItem("userType", "user");
      localStorage.setItem("userId", userData.user_id);
      localStorage.setItem("userName", userData.name);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userProfilePic", userData.profile_pic || "");
      
      if (data.phone) localStorage.setItem("userPhone", data.phone);
      
      toast.success("Registration successful! Welcome to House Help Hub.");
      navigate("/user/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMsg = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Worker Registration
  const onRegisterWorker = async (data: RegisterWorkerFormData) => {
    setIsSubmitting(true);
    try {
      const response = await registerWorker({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone
      });
      const workerData = response.data;
      
      localStorage.setItem("userType", "worker");
      localStorage.setItem("workerId", workerData.worker_id);
      localStorage.setItem("workerName", workerData.name);
      localStorage.setItem("workerEmail", data.email);
      localStorage.setItem("workerPhone", data.phone);
      localStorage.setItem("workerProfilePic", workerData.profile_pic || "");
      
      toast.success("Registration successful! You can now set up your services.");
      navigate("/worker/setup-services");
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMsg = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Tabs defaultValue="login" value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-1 bg-muted rounded-md">
                    <Button 
                      type="button" 
                      variant={userType === "user" ? "default" : "ghost"} 
                      className="flex-1"
                      onClick={() => setUserType("user")}
                    >
                      As User
                    </Button>
                    <Button 
                      type="button" 
                      variant={userType === "worker" ? "default" : "ghost"} 
                      className="flex-1"
                      onClick={() => setUserType("worker")}
                    >
                      As Worker
                    </Button>
                    <Button 
                      type="button" 
                      variant={userType === "admin" ? "default" : "ghost"} 
                      className="flex-1"
                      onClick={() => setUserType("admin")}
                    >
                      As Admin
                    </Button>
                  </div>

                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="your.email@example.com"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button
                          variant="link"
                          className="px-0 font-normal h-auto text-xs"
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-xs text-center text-muted-foreground">
                    Demo credentials for admin: admin@example.com / password123
                    <br />
                    For testing, all accounts use password: password123
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Choose your account type and register
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-1 bg-muted rounded-md mb-4">
                    <Button 
                      type="button" 
                      variant={userType === "user" ? "default" : "ghost"} 
                      className="flex-1"
                      onClick={() => setUserType("user")}
                    >
                      As User
                    </Button>
                    <Button 
                      type="button" 
                      variant={userType === "worker" ? "default" : "ghost"} 
                      className="flex-1"
                      onClick={() => setUserType("worker")}
                    >
                      As Worker
                    </Button>
                  </div>

                  {userType === "user" ? (
                    <form onSubmit={registerUserForm.handleSubmit(onRegisterUser)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Your Name"
                          {...registerUserForm.register("name")}
                        />
                        {registerUserForm.formState.errors.name && (
                          <p className="text-sm text-red-500">{registerUserForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          placeholder="name@example.com"
                          {...registerUserForm.register("email")}
                        />
                        {registerUserForm.formState.errors.email && (
                          <p className="text-sm text-red-500">{registerUserForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          {...registerUserForm.register("password")}
                        />
                        {registerUserForm.formState.errors.password && (
                          <p className="text-sm text-red-500">{registerUserForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          placeholder="9876543210"
                          {...registerUserForm.register("phone")}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Register as User"
                        )}
                      </Button>
                    </form>
                  ) : userType === "worker" ? (
                    <form onSubmit={registerWorkerForm.handleSubmit(onRegisterWorker)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Your Name"
                          {...registerWorkerForm.register("name")}
                        />
                        {registerWorkerForm.formState.errors.name && (
                          <p className="text-sm text-red-500">{registerWorkerForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          placeholder="name@example.com"
                          {...registerWorkerForm.register("email")}
                        />
                        {registerWorkerForm.formState.errors.email && (
                          <p className="text-sm text-red-500">{registerWorkerForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          {...registerWorkerForm.register("password")}
                        />
                        {registerWorkerForm.formState.errors.password && (
                          <p className="text-sm text-red-500">{registerWorkerForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          placeholder="9876543210"
                          {...registerWorkerForm.register("phone")}
                        />
                        {registerWorkerForm.formState.errors.phone && (
                          <p className="text-sm text-red-500">{registerWorkerForm.formState.errors.phone.message}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Register as Worker"
                        )}
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
                <CardFooter className="flex flex-col">
                  <p className="text-xs text-muted-foreground">
                    By registering, you agree to our terms and conditions.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
