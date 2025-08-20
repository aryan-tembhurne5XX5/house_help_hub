
import { Navigate } from "react-router-dom";

const Index = () => {
  console.log("Index component rendering, redirecting to home");
  return <Navigate to="/" replace />;
};

export default Index;
