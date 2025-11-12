import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { registerSchema } from "../../utils/validators";
import api from "../../services/api";
import { toast } from "react-toastify";
import { Loader2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { generateKeyPair } from "../../utils/crypto";
import { syncUserKeys } from "../../utils/syncUserKeys";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      // 1. Generate ECDH key pair
      const { publicKey, privateKey } = await generateKeyPair();

      // 2. Add publicKey to form data
      const payload = { ...data, publicKey };

      // 3. Save privateKey locally (never sent)
      localStorage.setItem("privateKey", privateKey);

      const res = await api.post("/auth/register", payload);
      return { ...res, publicKey }; // pass publicKey to onSuccess
    },
    onSuccess: async (res) => {
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      await syncUserKeys({ user });
      toast.success("Account created!");
      navigate("/profile");
    },
    onError: (err) => {
      toast.error(err.response?.data?.msg || "Signup failed");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[#0a0a0a]">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#365db7] to-[#009a83] mb-2">
            Create account
          </h1>
          <p className="text-[#a1a1a1]">
            Join AegisChat and start chatting securely
          </p>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-[#0a0a0a] rounded-xl shadow-sm border border-[#262626] p-6 sm:p-8 space-y-5"
        >
          {/* Name Field */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[#fafafa]"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
              <input
                {...register("name")}
                id="name"
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-[#365db7] focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-[#e7000b] flex items-center gap-1">
                <span className="text-xs">●</span> {errors.name.message}
              </p>
            )}
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[#fafafa]"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
              <input
                {...register("username")}
                id="username"
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#fafafa] placeholder-[#a1a1a1]focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="johndoe"
              />
            </div>
            {errors.username && (
              <p className="text-sm text-[#e7000b] flex items-center gap-1">
                <span className="text-xs">●</span> {errors.username.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#fafafa]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
              <input
                {...register("email")}
                id="email"
                type="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-[#e7000b] flex items-center gap-1">
                <span className="text-xs">●</span> {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#fafafa]"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
              <input
                {...register("password")}
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a1a1a1] hover:text-[#fafafa] transition-colors text-sm font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-[#e7000b] flex items-center gap-1">
                <span className="text-xs">●</span> {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[#fafafa]"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
              <input
                {...register("confirmPassword")}
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#262626] bg-[#171717] text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-[#e7000b] flex items-center gap-1">
                <span className="text-xs">●</span>{" "}
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#365db7] to-[#365db7]/90 hover:from-[#009a83]/50 hover:to-[#009a83]/60 text-[#fafafa] font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg mt-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Sign up</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#262626]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#0a0a0a] text-[#a1a1a1]">
                or
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-[#a1a1a1] text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#365db7] hover:text-[#009a83] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>

        <p className="text-center text-xs text-[#a1a1a1] mt-6">
          By signing up, you agree to our{" "}
          <a
            href="#"
            className="hover:text-slate-700 dark:hover:text-[#fafafa]"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="hover:text-slate-700 dark:hover:text-[#fafafa]"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
