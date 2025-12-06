# 🔧 Vercel Duplicate Project Cleanup

## 🚨 Problem Identified

You have **TWO Vercel projects** deploying from the same repository:
1. `app` ← Old project (causing errors)
2. `guidewire-app` ← Current project (should be the only one)

This causes:
- ❌ Conflicting deployments
- ❌ Different code versions on different domains
- ❌ Build errors from both projects
- ❌ Localhost and production showing different behaviors

---

## ✅ Solution: Remove Duplicate Project

### **Step 1: Delete the `app` Project**

1. **Login to Vercel:**
   - Go to https://vercel.com/dashboard

2. **Find the `app` Project:**
   - You should see TWO projects in your dashboard:
     - `app`
     - `guidewire-app`

3. **Delete `app`:**
   - Click on the **`app`** project
   - Scroll down to **Settings** (bottom left sidebar)
   - Scroll to the **Danger Zone** at the bottom
   - Click **"Delete Project"**
   - Type the project name to confirm
   - Click **"Delete"**

### **Step 2: Verify `guidewire-app` Configuration**

After deleting `app`, ensure `guidewire-app` is configured correctly:

1. **Go to `guidewire-app` project**
2. **Settings → Git:**
   ```
   Repository: lee4ski/fault-assessment-app
   Production Branch: main
   ```

3. **Settings → Environment Variables:**
   - Verify `OPENAI_API_KEY` exists for:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

4. **Settings → General:**
   ```
   Project Name: guidewire-app
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next (default)
   Install Command: npm install
   ```

### **Step 3: Wait for Fresh Deployment**

I've already triggered a fresh deployment:
- **Commit:** `7868fa5 - Deploy: Remove duplicate project, sync with localhost`
- **Wait:** ~60 seconds for build to complete
- **URL:** https://guidewire-app.vercel.app

---

## 🧪 **Verification Steps**

After completing the above:

### **1. Check Localhost**
- URL: http://localhost:3000
- Status: ✅ Running with fresh cache (cleared `.next/`)
- Commit: `7868fa5`

### **2. Check Production**
- URL: https://guidewire-app.vercel.app
- Wait 60 seconds after deleting `app` project
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Commit: Should show `7868fa5` (same as localhost)

### **3. Test Image Upload on Both**

**Localhost:**
1. Open http://localhost:3000
2. Click チャット
3. Upload accident photo
4. Note the AI's questions

**Production:**
1. Open https://guidewire-app.vercel.app
2. Click チャット
3. Upload **same** accident photo
4. Compare AI's questions

**Expected Result:**
- ✅ Both should use same code
- ✅ Both should use `gpt-4o` for images
- ⚠️ AI responses may still vary slightly (probabilistic model)
- ✅ But the **general approach** should be identical

---

## 📊 **Expected AI Behavior (Version 2.0)**

With identical code, both environments should have AI that:

1. ✅ Acknowledges the image
2. ✅ Asks about parties involved
3. ✅ Asks about signal states
4. ✅ Asks about vehicle details
5. ✅ Asks one question at a time (per prompt)
6. ✅ Confirms before finalizing analysis

**Note:** The exact wording will vary because GPT-4o is non-deterministic, but the content should be similar!

---

## 🎯 **Why This Happens**

### **Problem: Multiple Vercel Projects**

When you have multiple Vercel projects from the same GitHub repo:
- Each project can deploy different branches
- Each project can have different environment variables
- Each project can have different build settings
- GitHub webhook triggers deploy on BOTH projects
- Different domains serve different versions

### **Solution: Single Source of Truth**

By keeping only `guidewire-app`:
- ✅ One project = one deployment
- ✅ One domain = one version
- ✅ Easier to manage and debug
- ✅ No conflicts between deployments

---

## 📞 **If Issues Persist After Cleanup**

### **Issue: Still seeing different behavior**

1. **Clear Vercel cache:**
   ```bash
   # In project settings
   Settings → Advanced → Clear Build Cache
   ```

2. **Redeploy from Vercel UI:**
   - Go to Deployments tab
   - Click on latest deployment
   - Click ⋯ (three dots) → Redeploy
   - Select "Use existing Build Cache: OFF"

3. **Check environment variables:**
   - Verify `OPENAI_API_KEY` is the same across all environments
   - It should be the same key you use locally in `.env.local`

### **Issue: Build errors**

If you see build errors after cleanup:
1. Check the build logs in Vercel dashboard
2. Most common issue: Missing environment variables
3. Solution: Add `OPENAI_API_KEY` to all environments

---

## ✅ **Expected Final State**

After completing all steps:

| Environment | URL | Commit | Status |
|------------|-----|--------|--------|
| **Localhost** | http://localhost:3000 | `7868fa5` | ✅ Running |
| **Production** | https://guidewire-app.vercel.app | `7868fa5` | ✅ Deployed |

**Vercel Projects:**
- ❌ `app` - DELETED
- ✅ `guidewire-app` - ACTIVE (only one)

**Git Branches:**
- ✅ `main` @ `7868fa5`
- ✅ `master` @ `8a4ab25` (slightly behind, but not used by Vercel)

---

## 📝 **Summary Checklist**

- [ ] Delete `app` project from Vercel
- [ ] Verify `guidewire-app` settings
- [ ] Wait 60 seconds for fresh deployment
- [ ] Hard refresh production site
- [ ] Test image upload on both environments
- [ ] Confirm AI behavior is similar (not identical wording, but similar approach)

---

**Created:** December 6, 2025  
**Status:** Awaiting user action on Vercel dashboard  
**Next Step:** Delete `app` project from Vercel, then test

