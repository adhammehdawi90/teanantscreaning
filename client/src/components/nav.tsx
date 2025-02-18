import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusCircle, Layout, Video } from "lucide-react";

export default function Nav() {
  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="text-xl font-bold text-primary">AssessmentPro</a>
            </Link>
            <div className="flex gap-4">
              <Link href="/">
                <a className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Layout size={18} />
                  Dashboard
                </a>
              </Link>
              {/* <Link href="/video-interview/new">
                <a className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Video size={18} />
                  Interviews
                </a>
              </Link> */}
              {/* <Link href="/video-interview/new">
                <Button variant="ghost">
                  <Video className="mr-2 h-4 w-4" />
                  Video Interview
                </Button>
              </Link> */}
            </div>
          </div>
          <Link href="/create-assessment">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Assessment
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
