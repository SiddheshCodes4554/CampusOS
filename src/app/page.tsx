'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard } from "@/components/ui/GlassCard"
import {
  Sparkles,
  Cpu,
  Calendar,
  FileText,
  Briefcase,
  BookOpen,
  GraduationCap,
  ArrowRight,
  CheckCircle,
  Users,
  Shield
} from 'lucide-react'

export default function Home() {
  const features = [
    {
      title: 'Study Planner',
      desc: 'AI-driven coursework schedules, calendar milestones, and weekly revision targets mapped automatically.',
      icon: Calendar,
      color: 'var(--accent-blue)',
      glow: 'rgba(0, 210, 255, 0.15)'
    },
    {
      title: 'Resume Analyzer',
      desc: 'Instant ATS audit compliance checks, structural keyword identification, and custom formatting suggestions.',
      icon: FileText,
      color: 'var(--accent-purple)',
      glow: 'rgba(157, 78, 221, 0.15)'
    },
    {
      title: 'AI Project Builder',
      desc: 'Tailored coding portfolio suggestions complete with folder directory trees and professional PRD details.',
      icon: Cpu,
      color: '#10B981',
      glow: 'rgba(16, 185, 129, 0.15)'
    },
    {
      title: 'Internship Tracker',
      desc: 'Clean Kanban board tracking recruitment statuses, interview dates, salaries, and conversion rates.',
      icon: Briefcase,
      color: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.15)'
    },
    {
      title: 'Smart Notes',
      desc: 'Markdown workspace with integrated RAG AI utilities to auto-generate exam quizzes and card decks.',
      icon: BookOpen,
      color: '#EC4899',
      glow: 'rgba(236, 72, 153, 0.15)'
    },
    {
      title: 'Placement Preparation',
      desc: 'Simulate full AI mock recruiter chats, quant aptitude quizes, and DSA code verification compilers.',
      icon: GraduationCap,
      color: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.15)'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80 } }
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#f3f4f6] font-sans selection:bg-[var(--accent-blue)] selection:text-black">
      {/* Brand Header */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <span className="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-[var(--accent-blue)] mix-blend-screen opacity-90" />
            <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[var(--accent-purple)] mix-blend-screen opacity-90" />
            <div className="z-10 w-5.5 h-5.5 rounded-full bg-emerald-400 mix-blend-screen opacity-95" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white">CampusOS</span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-8 border border-white/10 hover:border-white/20 text-xs font-semibold px-4 cursor-pointer rounded-lg bg-transparent hover:bg-white/5 transition-colors text-white select-none"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center overflow-hidden z-10">
        {/* Glow ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-purple)] opacity-10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[var(--accent-blue)] select-none">
            <Sparkles size={12} className="animate-pulse" />
            <span>Now Integrated with Gemini 2.5 Flash</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-[#f3f4f6] to-[var(--text-secondary)] bg-clip-text text-transparent max-w-3xl leading-[1.15] mt-2">
            The AI-powered command center for college students
          </h1>

          <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-xl leading-relaxed mt-1">
            CampusOS is a handcrafted dashboard that consolidates study scheduling, ATS resume audits, portfolio project builders, internship tracking, and placement simulation checks.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-10 px-6 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold text-xs rounded-xl shadow-[0_4px_20px_rgba(0,210,255,0.25)] border-transparent cursor-pointer hover:opacity-95 gap-1.5 transition-all select-none"
            >
              Launch Application
              <ArrowRight size={14} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center h-10 px-5 text-xs border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 cursor-pointer text-white font-semibold transition-colors select-none"
            >
              Explore Features
            </a>
          </div>
        </motion.div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16 border-t border-white/5 relative z-10">
        <div className="text-center flex flex-col items-center gap-2 mb-12 select-none">
          <h2 className="text-2xl font-bold text-white tracking-tight">Handcrafted Productivity Tools</h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
            Every workspace is designed to maximize information density, streamline visual cues, and assist your growth.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <motion.div key={feat.title} variants={itemVariants}>
                <GlassCard className="h-full p-6 flex flex-col gap-4 group cursor-default transition-all hover:scale-[1.01] hover:shadow-[var(--shadow-glass)]">
                  {/* Subtle inner hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none blur-[40px] -z-10"
                    style={{ background: feat.glow }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105"
                    style={{
                      borderColor: `${feat.color}20`,
                      backgroundColor: `${feat.color}10`,
                      color: feat.color
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">{feat.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Product Highlight / Trust Bar */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-white/5 text-center relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto select-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
            <span className="text-xl font-bold text-white mt-1">100% Secure</span>
            <span className="text-[10px] text-[var(--text-secondary)] leading-normal max-w-[200px]">Private authorization session keys managed directly through Supabase DB.</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-blue-glow)] border border-[var(--accent-blue)]/20 text-[var(--accent-blue)] flex items-center justify-center">
              <Users size={18} />
            </div>
            <span className="text-xl font-bold text-white mt-1">Tailored for Students</span>
            <span className="text-[10px] text-[var(--text-secondary)] leading-normal max-w-[200px]">Crafted specifications designed around real engineering class schedules.</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-purple-glow)] border border-[var(--accent-purple)]/20 text-[var(--accent-purple)] flex items-center justify-center">
              <Shield size={18} />
            </div>
            <span className="text-xl font-bold text-white mt-1">AI-Powered</span>
            <span className="text-[10px] text-[var(--text-secondary)] leading-normal max-w-[200px]">Gemini 2.5 Flash provides lightning fast resumes reviews and folder layouts.</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-[11px] text-[var(--text-muted)] relative z-10 select-none">
        <span>© 2026 CampusOS. Built with Next.js & Supabase.</span>
        <div className="flex gap-4 mt-3 md:mt-0">
          <Link href="/login" className="hover:text-[var(--text-secondary)]">Sign In</Link>
          <span className="text-white/10">|</span>
          <span className="hover:text-[var(--text-secondary)] cursor-pointer">Security Protocol</span>
        </div>
      </footer>
    </div>
  )
}
