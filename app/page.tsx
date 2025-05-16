import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { MobileNav } from "@/components/ui/mobile-nav";
import { Sidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Terminal,
  Info,
  AlertCircle,
  Dumbbell,
  Heart,
  Calendar,
  LayoutDashboard,
  Users,
  Settings
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <h1 className="text-lg font-bold font-heading">FitCoach PWA Style Guide</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <section className="mb-12">
          <h1 className="text-h1 font-heading mb-2">FitCoach PWA UI Components</h1>
          <p className="text-body font-sans text-foreground mb-8">
            This page showcases the UI components based on the style guide.
          </p>

          {/* Typography Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Font families and text styles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h1 className="font-heading text-h1 font-bold">H1 Heading - Poppins Bold 28px</h1>
                <p className="text-sm text-foreground font-medium">Used for page titles</p>
              </div>
              <div>
                <h2 className="font-heading text-h2 font-medium">H2 Heading - Poppins Medium 22px</h2>
                <p className="text-sm text-foreground font-medium">Used for section headers</p>
              </div>
              <div>
                <h3 className="font-sans text-h3 font-medium">H3 Heading - Inter Medium 18px</h3>
                <p className="text-sm text-foreground font-medium">Used for card titles and form labels</p>
              </div>
              <div>
                <p className="font-sans text-body">Body Text - Inter Regular 16px</p>
                <p className="text-sm text-foreground font-medium">Used for paragraphs and descriptions</p>
              </div>
              <div>
                <p className="font-sans text-small">Small Text - Inter Regular 14px</p>
                <p className="text-sm text-foreground font-medium">Used for captions and secondary info</p>
              </div>
            </CardContent>
          </Card>

          {/* Colors Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Primary, secondary, and accent colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <div className="h-20 bg-primary rounded-md"></div>
                  <p className="mt-2 text-sm font-medium">Primary Blue</p>
                  <p className="text-xs text-foreground font-mono font-semibold">#2563EB</p>
                </div>
                <div className="flex flex-col">
                  <div className="h-20 bg-secondary rounded-md"></div>
                  <p className="mt-2 text-sm font-medium">Secondary Green</p>
                  <p className="text-xs text-foreground font-mono font-semibold">#10B981</p>
                </div>
                <div className="flex flex-col">
                  <div className="h-20 bg-accent rounded-md"></div>
                  <p className="mt-2 text-sm font-medium">Energy Orange</p>
                  <p className="text-xs text-foreground font-mono font-semibold">#F97316</p>
                </div>
                <div className="flex flex-col">
                  <div className="h-20 bg-destructive rounded-md"></div>
                  <p className="mt-2 text-sm font-medium">Warning Red</p>
                  <p className="text-xs text-foreground font-mono font-semibold">#EF4444</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buttons Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Button variants and sizes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Button Variants</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="link">Link</Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Button Sizes</h3>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button size="sm">Small</Button>
                      <Button size="default">Default</Button>
                      <Button size="lg">Large</Button>
                      <Button size="icon"><Dumbbell className="h-5 w-5" /></Button>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Button States</h3>
                  <div className="space-y-2">
                    <Button className="w-full">Default</Button>
                    <Button className="w-full" disabled>Disabled</Button>
                    <Button className="w-full hover:bg-primary/90">Hover (Simulated)</Button>
                    <Button className="w-full focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary">Focus (Simulated)</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Elements Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>Inputs, selects, and form controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Text Input</label>
                    <Input placeholder="Enter your name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Disabled Input</label>
                    <Input placeholder="Disabled input" disabled />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Select Dropdown</label>
                    <Select defaultValue="option1">
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option1">Option 1</SelectItem>
                        <SelectItem value="option2">Option 2</SelectItem>
                        <SelectItem value="option3">Option 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Disabled Select</label>
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Disabled select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Cards</CardTitle>
              <CardDescription>Card layouts and variations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Profile</CardTitle>
                    <CardDescription>Example client card</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm">John Doe</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Goal:</span>
                        <span className="text-sm">Weight Loss</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Sessions:</span>
                        <span className="text-sm">12 completed</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">View Details</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workout Plan</CardTitle>
                    <CardDescription>Example workout card</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span className="text-sm">Bench Press: 3 sets x 10 reps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span className="text-sm">Squats: 3 sets x 12 reps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-destructive" />
                        <span className="text-sm">Cardio: 20 minutes</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" variant="secondary">Edit Workout</Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Tables Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Tables</CardTitle>
              <CardDescription>Data tables and lists</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Client schedule for this week</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Doe</TableCell>
                    <TableCell>Mon, Jun 10</TableCell>
                    <TableCell>9:00 AM</TableCell>
                    <TableCell className="text-green-600">Confirmed</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Jane Smith</TableCell>
                    <TableCell>Tue, Jun 11</TableCell>
                    <TableCell>2:30 PM</TableCell>
                    <TableCell className="text-amber-600">Pending</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Mike Johnson</TableCell>
                    <TableCell>Wed, Jun 12</TableCell>
                    <TableCell>11:00 AM</TableCell>
                    <TableCell className="text-green-600">Confirmed</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Alerts Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Notification and alert components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is an informational alert message.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  This is an error alert message.
                </AlertDescription>
              </Alert>

              <Alert className="border-green-600 text-green-700">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription className="text-green-700">
                  This is a success alert message.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Navigation Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
              <CardDescription>Mobile and desktop navigation components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Mobile Navigation (Bottom Bar)</h3>
                  <div className="border border-gray-300 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-800">
                    <div className="h-16 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-around">
                      <div className="flex flex-col items-center text-primary">
                        <LayoutDashboard className="h-6 w-6" />
                        <span className="text-xs font-medium mt-1">Dashboard</span>
                      </div>
                      <div className="flex flex-col items-center text-gray-700 dark:text-gray-300">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col items-center text-gray-700 dark:text-gray-300">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col items-center text-gray-700 dark:text-gray-300">
                        <Dumbbell className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col items-center text-gray-700 dark:text-gray-300">
                        <Settings className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-xs text-center mt-2 text-foreground font-medium">
                      Bottom navigation with 5 icons, active item shows label
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Desktop Navigation (Sidebar)</h3>
                  <div className="border border-gray-300 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-800">
                    <div className="h-64 w-64 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 flex flex-col">
                      <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                        <h3 className="text-lg font-bold">FitCoach</h3>
                      </div>
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary text-white">
                          <LayoutDashboard className="h-5 w-5" />
                          <span>Dashboard</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-200">
                          <Users className="h-5 w-5" />
                          <span>Clients</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-200">
                          <Calendar className="h-5 w-5" />
                          <span>Schedule</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-200">
                          <Dumbbell className="h-5 w-5" />
                          <span>Workouts</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-200">
                          <Settings className="h-5 w-5" />
                          <span>Settings</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center mt-2 text-foreground font-medium">
                      Sidebar navigation with vertical menu, 256px width
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Mobile Navigation (visible on mobile only) */}
      <div className="block md:hidden">
        <MobileNav />
      </div>

      {/* Sidebar (visible on desktop only) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
    </div>
  );
}