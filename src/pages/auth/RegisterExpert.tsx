import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Eye,
  EyeOff,
  Upload,
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Phone,
  MessageSquare,
  Globe,
  Heart,
  Image,
  Plus,
  X,
  Award,
  Clock,
  GraduationCap,
  Briefcase,
  Check,
  ChevronsUpDown,
  PoundSterling,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ProfilePictureUpload } from "@/components/shared/ProfilePictureUpload";
import { UserRole } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Define titles by expert type
const expertTitles = {
  therapist: "Therapist",
  relationship_expert: "Relationship Expert",
  financial_expert: "Financial Expert",
  dating_coach: "Dating Coach",
  health_wellness_coach: "Health & Wellness Coach",
};

// Define descriptions by expert type
const expertDescriptions = {
  therapist: "Join our platform to provide mental health support.",
  relationship_expert:
    "Join our platform to help with relationship issues and family dynamics.",
  financial_expert:
    "Join our platform to provide financial guidance and planning support.",
  dating_coach:
    "Join our platform to help with dating, confidence, and relationship building.",
  health_wellness_coach:
    "Join our platform to provide fitness, nutrition, and wellness guidance.",
};

const formSchema = z.object({
  full_name: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .optional(),
  title: z.string().optional(),
  experience_years: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), {
      message: "Years of experience must be a number",
    }),
  bio: z
    .string()
    .min(10, { message: "Bio is required and must be at least 10 characters" }),
  education: z.string().optional(),
  certifications: z.string().optional(),
  languages: z.string().optional(),
  appointment_fee: z
    .string()
    .min(1, { message: "Appointment fee is required" }),
  session_duration: z
    .string()
    .min(1, { message: "Session duration is required" }),
  phone_number: z.string().min(10, {
    message: "Phone number is required and must be at least 10 digits",
  }),
  company_name: z
    .string()
    .min(1, { message: "Practice or company name is required" }),
  website: z
    .string()
    .url({ message: "Please enter a valid URL" })
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

// Define form steps
const formSteps = [
  {
    title: "Account Details",
    description: "Create your account credentials",
    fields: ["full_name", "username", "email", "password"],
    icon: <User className="h-6 w-6" />,
  },
  {
    title: "Professional Information",
    description: "Tell us about your expertise",
    fields: ["title", "experience_years", "expertise"],
    icon: <Award className="h-6 w-6" />,
  },
  {
    title: "About You",
    description: "Share your background and approach",
    fields: ["bio", "education", "certifications", "languages"],
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    title: "Practice Details",
    description: "Information about your practice",
    fields: [
      "appointment_fee",
      "session_duration",
      "phone_number",
      "company_name",
      "website",
    ],
    icon: <Briefcase className="h-6 w-6" />,
  },
  {
    title: "Profile Picture",
    description: "Upload your professional photo",
    fields: ["profile_picture"],
    icon: <Image className="h-6 w-6" />,
  },
];

export default function RegisterExpert() {
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);

  // Extract expert type from pathname instead of useParams
  const getExpertTypeFromPath = (): string => {
    const pathname = location.pathname; // e.g., "/register/relationship_expert"
    const parts = pathname.split("/");
    const expertType = parts[parts.length - 1]; // Get the last part
    return expertType;
  };

  const expertType = getExpertTypeFromPath();

  // Validate expert type
  const validExpertType = expertType as keyof typeof expertTitles;
  const isValidExpertType = Object.keys(expertTitles).includes(validExpertType);

  const expertTitle = isValidExpertType
    ? expertTitles[validExpertType]
    : "Professional";

  const expertDescription = isValidExpertType
    ? expertDescriptions[validExpertType]
    : "Join our platform to provide expertise.";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      username: "",
      title: "",
      experience_years: 0,
      bio: "",
      education: "",
      certifications: "",
      languages: "",
      appointment_fee: "",
      session_duration: "",
      phone_number: "",
      company_name: "",
      website: "",
    },
    mode: "onChange",
  });

  const nextStep = async () => {
    const fields = formSteps[currentStep].fields;
    const validFields = fields.filter(
      (field) => field !== "expertise" && field !== "profile_picture"
    );

    const isValid = await form.trigger(validFields as any);

    // Additional validation for expertise on step 1 (Professional Information)
    if (currentStep === 1 && selectedExpertise.length === 0) {
      toast.error("Please add at least one area of expertise");
      return;
    }

    if (!isValid) {
      // Get current step info for specific error messages
      const currentStepTitle = formSteps[currentStep].title;
      const errors = form.formState.errors;

      // Show specific error messages based on current step
      let errorMessage = `Please fill in all required fields in ${currentStepTitle}`;

      if (currentStep === 0) {
        // Step 1: Account Details
        if (errors.full_name) errorMessage = "Please enter your full name";
        else if (errors.email)
          errorMessage = "Please enter a valid email address";
        else if (errors.password)
          errorMessage = "Please enter a password with at least 6 characters";
        else if (errors.username)
          errorMessage = "Username must be at least 3 characters";
      } else if (currentStep === 1) {
        // Step 2: Professional Information
        if (errors.experience_years)
          errorMessage = "Please enter your years of experience";
      } else if (currentStep === 2) {
        // Step 3: About You
        if (errors.bio)
          errorMessage = "Please enter a bio with at least 10 characters";
      } else if (currentStep === 3) {
        // Step 4: Practice Details
        if (errors.appointment_fee)
          errorMessage = "Please enter your appointment fee";
        else if (errors.session_duration)
          errorMessage = "Please enter your session duration";
        else if (errors.phone_number)
          errorMessage =
            "Please enter a valid phone number with at least 10 digits";
        else if (errors.company_name)
          errorMessage = "Please enter your practice or company name";
        else if (errors.website)
          errorMessage = "Please enter a valid website URL";
      }

      toast.error(errorMessage);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, formSteps.length - 1));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  // Add expertise area
  const addExpertise = () => {
    const trimmedInput = expertiseInput.trim();
    if (trimmedInput && !selectedExpertise.includes(trimmedInput)) {
      setSelectedExpertise([...selectedExpertise, trimmedInput]);
      setExpertiseInput("");
    }
  };

  // Remove expertise area
  const removeExpertise = (expertise: string) => {
    setSelectedExpertise(selectedExpertise.filter((exp) => exp !== expertise));
  };

  // Handle Enter key press in expertise input
  const handleExpertiseKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addExpertise();
    }
  };

  // New function to handle form data collection (no account creation yet)
  const collectFormData = (data: FormData) => {
    setFormData(data);
    console.log("Form data collected:", data);
    console.log("Expert type from path:", expertType);
    console.log("Is valid expert type:", isValidExpertType);

    // Show confirmation or preview step
    toast.success(
      `All information collected for ${expertTitle} registration! Review and create your profile.`
    );
  };

  // New function to actually create the account and profile
  const createProfile = async () => {
    if (!formData) {
      toast.error("Form data not found. Please fill out the form again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine the role based on the extracted expert type
      const role = isValidExpertType
        ? (validExpertType as UserRole)
        : "therapist";

      console.log(
        "Creating profile with role:",
        role,
        "for expert type:",
        expertType,
        "from path:",
        location.pathname
      );

      // Debug: Log expertise data
      console.log("Selected expertise before saving:", selectedExpertise);
      console.log("Expertise array length:", selectedExpertise.length);

      // Step 1: Create the user account in auth.users
      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            user_role: role,
            full_name: formData.full_name,
          },
        },
      });

      if (authError) {
        // Check if the error is about user already existing
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("already exists")
        ) {
          toast.error("Account already exists, please login.");
        } else {
          toast.error(authError.message || "Registration failed");
        }
        console.error("Auth signup error:", authError);
        setIsSubmitting(false);
        return;
      }

      if (!userData.user) {
        toast.error("Failed to create account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      console.log(
        "User created with ID:",
        userData.user.id,
        "and role metadata:",
        userData.user.user_metadata
      );

      // Convert expertise array to JSON string for storage in specialization field (same as profile update)
      const specialization = JSON.stringify(selectedExpertise);
      console.log(
        "Converted expertise to JSON for specialization field:",
        specialization
      );

      // Step 2: Create profile record with all user details
      const userId = userData.user.id;
      const profileData = {
        id: userId,
        username: formData.username,
        full_name: formData.full_name,
        avatar_url: uploadedAvatarUrl, // Use the pre-uploaded avatar URL
        website: formData.website,
        user_role: role, // Explicitly set the correct role
        title: formData.title,
        experience_years: Number(formData.experience_years) || 0,
        phone_number: formData.phone_number,
        company_name: formData.company_name,
        email: formData.email,
        bio: formData.bio,
        education: formData.education,
        certifications: formData.certifications,
        languages: formData.languages,
        appointment_fee: formData.appointment_fee
          ? Number(formData.appointment_fee)
          : null,
        session_duration: formData.session_duration
          ? Number(formData.session_duration)
          : null,
        specialization: specialization, // Save expertise as JSON string in specialization field
        status: "active",
      };

      // Debug: Log the complete profile data
      console.log("Creating profile with data:", profileData);
      console.log(
        "Profile data specialization (expertise):",
        profileData.specialization
      );

      // Insert the profile data
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        console.error("Profile error details:", profileError.details);
        console.error("Profile error hint:", profileError.hint);
        toast.error(
          "Account created but profile details could not be saved. Please contact support."
        );
      } else {
        console.log("Profile created successfully");
        console.log(
          "Expertise saved successfully in specialization field:",
          specialization
        );
        toast.success("Account creation successful, please login.");
        navigate("/login");
      }
    } catch (error: any) {
      console.error("Expert registration submission error:", error);
      if (
        error.message.includes("already exists") ||
        error.message.includes("already registered")
      ) {
        toast.error("Account already exists, please login.");
      } else {
        toast.error(`Registration failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modified onSubmit to collect data instead of creating account
  const onSubmit = async (data: FormData) => {
    collectFormData(data);
  };

  const isLastStep = currentStep === formSteps.length - 1;
  const progress = ((currentStep + 1) / formSteps.length) * 100;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  };

  return (
    <AuthLayout
      title={`Register as a ${expertTitle}`}
      description={expertDescription}
      maxWidth="md:max-w-xl"
    >
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {formSteps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
            {formSteps[currentStep].icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {formSteps[currentStep].title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formSteps[currentStep].description}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={slideVariants}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* Step 1: Account Details */}
            {currentStep === 0 && (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="full_name">Full Name</Label>
                  </div>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Dr. Jane Smith"
                    {...form.register("full_name")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.full_name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.full_name.message}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="username">Username</Label>
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="dr_jane_smith"
                    {...form.register("username")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@practice.com"
                    {...form.register("email")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...form.register("password")}
                      className="bg-transparent"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Professional Information */}
            {currentStep === 1 && (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="title">Professional Title</Label>
                  </div>
                  <Input
                    id="title"
                    type="text"
                    placeholder={
                      isValidExpertType
                        ? `${expertTitle}`
                        : "Professional Title"
                    }
                    {...form.register("title")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your title will be displayed on your profile (e.g.,
                    "Clinical Psychologist", "Relationship Counselor")
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="experience_years">
                      Years of Experience
                    </Label>
                  </div>
                  <Input
                    id="experience_years"
                    type="number"
                    placeholder="5"
                    {...form.register("experience_years")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.experience_years && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.experience_years.message}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="expertise">Areas of Expertise</Label>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        id="expertise"
                        type="text"
                        placeholder={
                          isValidExpertType
                            ? validExpertType === "financial_expert"
                              ? "Enter expertise (e.g., Budget Planning, Investment Planning, Debt Management)"
                              : validExpertType === "relationship_expert"
                              ? "Enter expertise (e.g., Couples Therapy, Family Counseling, Conflict Resolution)"
                              : validExpertType === "dating_coach"
                              ? "Enter expertise (e.g., Confidence Building, Online Dating, Communication Skills)"
                              : validExpertType === "health_wellness_coach"
                              ? "Enter expertise (e.g., Nutrition Planning, Fitness Coaching, Stress Management)"
                              : "Enter expertise (e.g., Anxiety, Depression, PTSD)"
                            : "Enter an area of expertise"
                        }
                        value={expertiseInput}
                        onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyPress={handleExpertiseKeyPress}
                        className="bg-transparent flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addExpertise}
                        disabled={!expertiseInput.trim()}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {selectedExpertise.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedExpertise.map((expertise, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            {expertise}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => removeExpertise(expertise)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {selectedExpertise.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Add at least one area of expertise.
                        {isValidExpertType &&
                          validExpertType === "financial_expert" &&
                          " Examples: Budget Planning, Investment Planning, Debt Management, Retirement Planning, etc."}
                        {isValidExpertType &&
                          validExpertType === "relationship_expert" &&
                          " Examples: Couples Therapy, Family Counseling, Conflict Resolution, Communication Skills, etc."}
                        {isValidExpertType &&
                          validExpertType === "dating_coach" &&
                          " Examples: Confidence Building, Online Dating, Communication Skills, Post-Divorce Support, etc."}
                        {isValidExpertType &&
                          validExpertType === "health_wellness_coach" &&
                          " Examples: Nutrition Planning, Fitness Coaching, Stress Management, Sleep Hygiene, etc."}
                        {(!isValidExpertType ||
                          validExpertType === "therapist") &&
                          " Examples: Anxiety, Depression, PTSD, Relationship Issues, Trauma, Addiction, etc."}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: About You */}
            {currentStep === 2 && (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="bio">Bio</Label>
                  </div>
                  <Textarea
                    id="bio"
                    placeholder="Provide a brief description of your approach and philosophy..."
                    {...form.register("bio")}
                    className="bg-transparent min-h-32"
                  />
                  {form.formState.errors.bio && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.bio.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Describe your approach, methods, and philosophy. This helps
                    potential clients understand how you work.
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="education">Education</Label>
                  </div>
                  <Input
                    id="education"
                    type="text"
                    placeholder="Ph.D. in Clinical Psychology, Stanford University"
                    {...form.register("education")}
                    className="bg-transparent"
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="certifications">Certifications</Label>
                  </div>
                  <Input
                    id="certifications"
                    type="text"
                    placeholder="Licensed Clinical Psychologist, Board Certified"
                    {...form.register("certifications")}
                    className="bg-transparent"
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="languages">
                      Languages (comma separated)
                    </Label>
                  </div>
                  <Input
                    id="languages"
                    type="text"
                    placeholder="English, Spanish, French"
                    {...form.register("languages")}
                    className="bg-transparent"
                  />
                </motion.div>
              </motion.div>
            )}

            {/* Step 4: Practice Details */}
            {currentStep === 3 && (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="appointment_fee">Appointment Fee *</Label>
                  </div>
                  <Input
                    id="appointment_fee"
                    type="text"
                    placeholder="£100"
                    {...form.register("appointment_fee")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.appointment_fee && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.appointment_fee.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Set your fee per session. This can be updated later.
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="session_duration">Session Duration *</Label>
                  </div>
                  <Input
                    id="session_duration"
                    type="text"
                    placeholder="60 minutes"
                    {...form.register("session_duration")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.session_duration && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.session_duration.message}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="phone_number">Phone Number</Label>
                  </div>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    {...form.register("phone_number")}
                    className="bg-transparent"
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="company_name">
                      Practice or Company Name *
                    </Label>
                  </div>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Company or Practice Name"
                    {...form.register("company_name")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.company_name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.company_name.message}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="website">Website (optional)</Label>
                  </div>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    {...form.register("website")}
                    className="bg-transparent"
                  />
                  {form.formState.errors.website && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.website.message}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Step 5: Profile Picture */}
            {currentStep === 4 && (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={itemVariants} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="profilePic">Profile Picture</Label>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-6 py-8">
                    <ProfilePictureUpload
                      onImageSelect={setProfileImage}
                      onImagePreview={setProfileImagePreview}
                      uploadedAvatarUrl={uploadedAvatarUrl}
                      isUploading={isUploadingImage}
                      setUploadedAvatarUrl={setUploadedAvatarUrl}
                    />

                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      A professional profile picture helps build trust with
                      potential clients. Choose a high-quality photo with good
                      lighting and a neutral background.
                      {uploadedAvatarUrl && (
                        <span className="block mt-2 text-green-400 text-xs">
                          ✓ Your profile picture has been uploaded successfully!
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex gap-4">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex items-center gap-2"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}

          {!isLastStep ? (
            <Button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 ml-auto"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : !formData ? (
            <Button
              type="submit"
              className="flex items-center gap-2 ml-auto"
              disabled={isSubmitting}
            >
              Collect Information <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={createProfile}
              className="flex items-center gap-2 ml-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Profile..." : "Create Profile"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-muted-foreground">Already have an account?</span>{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Login here
        </Link>
      </div>
      <div className="mt-2 text-center text-sm">
        <span className="text-muted-foreground">Are you a patient?</span>{" "}
        <Link
          to="/register/patient"
          className="font-medium text-primary hover:underline"
        >
          Register here
        </Link>
      </div>
    </AuthLayout>
  );
}
