# 🪟 Step-by-Step Deployment for Windows - NO PROBLEMS!

## Let's Deploy Right Now - Follow These Exact Steps

---

## 🎯 Method 1: Using Git Bash (EASIEST)

### STEP 1: Install Git for Windows

1. Go to: https://git-scm.com/download/win
2. Click "Download for Windows"
3. Run the installer
4. **Keep all default options** - just click "Next" until done
5. ✅ **Git Bash will be installed automatically!**

---

### STEP 2: Open Git Bash

1. Press **Windows Key**
2. Type: `Git Bash`
3. Click on **Git Bash** app
4. A black terminal window opens - that's Git Bash!

---

### STEP 3: Find Your EC2 Instance IP

1. Go to **AWS Console** → **EC2** → **Instances**
2. Find your instance (should show "Running")
3. Look at **Public IPv4 address** - copy this number
   - Example: `54.123.45.67`
4. **Write it down!** We'll use it now.

---

### STEP 4: Find Your Key File (.pem)

1. Usually in **Downloads** folder
2. File name like: `glassshop-key.pem` or `your-key.pem`
3. **Note the full path!**

---

### STEP 5: Connect to EC2 (Copy-Paste in Git Bash)

```bash
# Replace YOUR-KEY-FILE.pem with your actual file name
# Replace YOUR-EC2-IP with the IP you copied

cd ~/Downloads
chmod 400 YOUR-KEY-FILE.pem
ssh -i YOUR-KEY-FILE.pem ubuntu@YOUR-EC2-IP
```

**Example:**
```bash
cd ~/Downloads
chmod 400 glassshop-key.pem
ssh -i glassshop-key.pem ubuntu@54.123.45.67
```

**Press Enter after each line!**

---

### STEP 6: If Connection Works - You See This:

```
Welcome to Ubuntu 22.04...
ubuntu@ip-xxx-xxx-xxx-xxx:~$
```

**✅ Success! You're connected!** 

Now continue to **STEP 7** below.

---

### STEP 6B: If Connection Fails - Try This:

#### Error: "Permission denied (publickey)"

**Solution 1:** Check username is `ubuntu` (not `ec2-user`)
```bash
ssh -i YOUR-KEY-FILE.pem ubuntu@YOUR-EC2-IP
```

**Solution 2:** Use full path
```bash
ssh -i "C:/Users/YourWindowsUsername/Downloads/YOUR-KEY-FILE.pem" ubuntu@YOUR-EC2-IP
```

**Solution 3:** Check Security Group
1. AWS Console → EC2 → Security Groups
2. Find your instance's security group
3. Check **Inbound Rules**
4. Must have: **SSH, Port 22, Source: 0.0.0.0/0** (or your IP)
5. If missing, add it!

#### Error: "Connection timed out"

**Solution:**
1. Check EC2 instance is **"Running"** (not "Stopped")
2. Check Security Group allows Port 22
3. Try: `ssh -v -i YOUR-KEY-FILE.pem ubuntu@YOUR-EC2-IP` (shows more details)

---

### STEP 7: Deploy Application (Once Connected to EC2)

**You should now see:** `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

**Copy and paste these commands ONE BY ONE:**

```bash
# 1. Go to temp folder
cd /tmp

# 2. Clone your repository (REPLACE WITH YOUR GITHUB URL!)
git clone https://github.com/YOUR-USERNAME/GlassShopApplication.git temp-repo

# 3. Go to deploy folder
cd temp-repo/deploy

# 4. Make script executable
chmod +x deploy-from-github.sh

# 5. Run deployment (this takes 15-20 minutes)
sudo ./deploy-from-github.sh
```

**When script asks:**
- **Repository URL:** Paste your GitHub URL (e.g., `https://github.com/yourname/GlassShopApplication.git`)
- **Branch:** Press Enter (uses `master` by default)

**Wait 15-20 minutes** - Script does everything automatically!

---

### STEP 8: Access Your Application

1. **Open any web browser on Windows**
2. Go to: `http://YOUR-EC2-IP`
3. **You should see the login page!** 🎉

---

## 🎯 Method 2: AWS Systems Manager (NO KEY NEEDED!)

If SSH isn't working, use this method - **no SSH key needed!**

### STEP 1: Enable Systems Manager

1. Go to **AWS Console** → **EC2** → **Instances**
2. Select your instance
3. Click **Actions** → **Security** → **Modify IAM role**
4. **Create new IAM role:**
   - Click "Create new IAM role"
   - Name: `EC2-SSM-Role`
   - Attach policy: **`AmazonSSMManagedInstanceCore`**
   - Click "Create IAM role"
   - Select the new role
   - Click "Update IAM role"
5. **Wait 2-3 minutes** (for agent to start)

---

### STEP 2: Connect via Browser

1. Go to **AWS Console** → **Systems Manager** → **Session Manager**
2. Click **"Start session"**
3. Select your EC2 instance
4. Click **"Start session"**
5. **Browser terminal opens!** ✅

---

### STEP 3: Deploy (In Browser Terminal)

**Copy and paste these commands:**

```bash
# Go to temp folder
cd /tmp

# Clone repository (REPLACE WITH YOUR URL!)
git clone https://github.com/YOUR-USERNAME/GlassShopApplication.git temp-repo

# Go to deploy folder
cd temp-repo/deploy

# Make executable
chmod +x deploy-from-github.sh

# Run deployment
sudo ./deploy-from-github.sh
```

**Same as Method 1 - wait 15-20 minutes!**

---

## 🔍 What's Blocking You? (Troubleshooting)

### ❌ Can't install Git for Windows?
- **Alternative:** Use Windows PowerShell
- Open PowerShell and run:
  ```powershell
  ssh -i "C:\Users\YourUsername\Downloads\your-key.pem" ubuntu@your-ec2-ip
  ```

### ❌ Don't have EC2 instance?
- **Go to AWS Console** → **EC2** → **Launch Instance**
- Choose **Ubuntu 22.04 LTS**
- Instance type: **t3.medium**
- Security Group: Add rules for ports 22, 80
- Launch and download key pair

### ❌ Don't have code on GitHub?
- **Upload to GitHub first:**
  ```bash
  # In Git Bash on Windows (in your project folder)
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git
  git push -u origin master
  ```

### ❌ Security Group blocking?
- **Fix Security Group:**
  1. EC2 Console → Security Groups
  2. Find your instance's security group
  3. Edit Inbound Rules
  4. Add: Type: SSH, Port: 22, Source: 0.0.0.0/0
  5. Add: Type: HTTP, Port: 80, Source: 0.0.0.0/0
  6. Save rules

### ❌ Still can't connect?
- **Use Method 2** (AWS Systems Manager) - no key needed!

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Can access: `http://YOUR-EC2-IP`
- [ ] See login/register page
- [ ] Can register new shop
- [ ] Can login
- [ ] Application works

**Check services (on EC2):**
```bash
sudo systemctl status glassshop-backend    # Should show "active"
pm2 status                                   # Should show "online"
sudo systemctl status nginx                 # Should show "active"
```

---

## 📞 Still Having Issues?

**Tell me exactly what error you're seeing:**
1. What step are you on?
2. What error message do you see?
3. Can you connect to EC2? (Yes/No)
4. Is your code on GitHub? (Yes/No)

**Or use Method 2 (AWS Systems Manager) - it's easier!**

---

## 🚀 Ready? Let's Do It!

**Start with Step 1 above and go through each step!**

**You can do this! 💪**

