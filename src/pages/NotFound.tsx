import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="gradient-gold mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <GraduationCap className="h-8 w-8 text-gold-foreground" aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Giáo lý Xóm Chiếu</p>
        <h1 className="font-heading text-5xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">Trang bạn đang tìm không tồn tại hoặc đã được chuyển đi.</p>
        <Button asChild className="mt-6 h-11">
          <Link to="/dashboard">Về trang tổng quan</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
