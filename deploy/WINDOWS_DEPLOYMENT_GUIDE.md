# 🪟 Windows to AWS EC2 Deployment Guide

## Connecting from Windows to Ubuntu EC2 Instance

This guide is specifically for Windows users deploying to Ubuntu EC2 instances.

---

## 🔑 Method 1: Using Git Bash (Easiest - Recommended)

Git Bash comes with Git for Windows and includes SSH.

### Step 1: Install Git for Windows

If you don't have it:
1. Download: https://git-scm.com/download/win
2. Install with default settings
3. Git Bash will be installed automatically

### Step 2: Set Key Permissions

```bash
# Open Git Bash
# Navigate to where your .pem file is located
cd /c/Users/YourUsername/Downloads

# Set permissions (Windows doesn't use chmod, but Git Bash does)
chmod 400 your-key.pem
```

### Step 3: Connect to EC2

```bash
# Connect to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Example:
# ssh -i glassshop-key.pem ubuntu@54.123.45.67
```

**If you get "Permission denied":**
- Make sure you're using `ubuntu` (not `ec2-user`) for Ubuntu instances
- Check the key file path is correct
- Try: `ssh -i "C:/Users/YourUsername/Downloads/your-key.pem" ubuntu@your-ec2-ip`

---

## 🔑 Method 2: Using Windows Terminal / PowerShell

Windows 10/11 includes OpenSSH client.

### Step 1: Enable OpenSSH (if not already enabled)

1. Open **Settings** → **Apps** → **Optional Features**
2. Search for "OpenSSH Client"
3. Install if not already installed

### Step 2: Connect to EC2

```powershell
# Open PowerShell or Windows Terminal
# Navigate to key file location
cd C:\Users\YourUsername\Downloads

# Connect (use full path with quotes)
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Example:
# ssh -i "glassshop-key.pem" ubuntu@54.123.45.67
```

**Note**: Windows doesn't support chmod, but SSH will still work.

---

## 🔑 Method 3: Using PuTTY (Alternative)

If you prefer a GUI tool.

### Step 1: Download PuTTY

1. Download PuTTY: https://www.putty.org/
2. Download PuTTYgen: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html

### Step 2: Convert .pem to .ppk

1. Open **PuTTYgen**
2. Click **Load** → Select your `.pem` file
3. Change file type filter to "All Files (*.*)"
4. Click **Save private key** → Save as `.ppk` file
5. Click **Yes** when warned about saving without passphrase

### Step 3: Connect with PuTTY

1. Open **PuTTY**
2. Enter:
   - **Host Name**: `ubuntu@your-ec2-ip`
   - **Port**: 22
   - **Connection Type**: SSH
3. Go to **Connection** → **SSH** → **Auth** → **Credentials**
4. Click **Browse** → Select your `.ppk` file
5. Go back to **Session** → Click **Open**

---

## 🔑 Method 4: Using AWS Systems Manager (No Key Needed!)

**Best option if you can't use SSH keys!**

### Step 1: Enable Systems Manager on EC2

1. Go to EC2 Console → Select your instance
2. Click **Actions** → **Security** → **Modify IAM role**
3. Create/Attach IAM role with `AmazonSSMManagedInstanceCore` policy
4. Wait 2-3 minutes for agent to start

### Step 2: Connect via AWS Console

1. Go to **Systems Manager** → **Session Manager**
2. Click **Start session**
3. Select your EC2 instance
4. Click **Start session**
5. Browser-based terminal opens (no key needed!)

### Step 3: Upload Files (if needed)

Use AWS Systems Manager → **Run Command** or use S3 to transfer files.

---

## 🚀 Deployment Steps (After Connecting)

Once you're connected to EC2 via any method above:

### Option A: Clone from GitHub (Recommended)

```bash
# On EC2 instance (after SSH connection)
cd /tmp

# Clone your repository
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo

# Navigate to deploy folder
cd temp-repo/deploy

# Make script executable
chmod +x deploy-from-github.sh

# Run deployment
sudo ./deploy-from-github.sh
```

### Option B: Upload Script via SCP (From Windows)

If you have Git Bash or WSL:

```bash
# From Git Bash on Windows
scp -i your-key.pem deploy/deploy-from-github.sh ubuntu@your-ec2-ip:/tmp/

# Then SSH and run:
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /tmp
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

### Option C: Copy-Paste Script Content

1. Open `deploy/deploy-from-github.sh` in Notepad
2. Copy all content
3. SSH to EC2
4. Create file: `nano /tmp/deploy.sh`
5. Paste content, save (Ctrl+O, Enter, Ctrl+X)
6. Run: `chmod +x /tmp/deploy.sh && sudo /tmp/deploy.sh`

---

## 📋 Complete Windows Deployment Workflow

### Step 1: Prepare on Windows

```bash
# Open Git Bash
# Navigate to your project
cd /d/Git\ pull/GlassShopApplication-master

# Make sure code is committed
git status

# Push to GitHub (if not already done)
git add .
git commit -m "Ready for deployment"
git push origin master
```

### Step 2: Connect to EC2

```bash
# In Git Bash
cd ~/Downloads  # or wherever your .pem file is
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 3: Deploy on EC2

```bash
# Now you're on EC2 (Ubuntu)
cd /tmp

# Clone repository
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo

# Navigate to deploy folder
cd temp-repo/deploy

# Run deployment
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

**When prompted:**
- Enter your GitHub repository URL
- Enter branch (default: `master`)

### Step 4: Access Application

Open browser on Windows:
```
http://your-ec2-ip
```

---

## 🔧 Troubleshooting Windows SSH Issues

### Issue: "Permission denied (publickey)"

**Solutions:**

1. **Check key file path:**
   ```bash
   # Use full path with quotes
   ssh -i "C:/Users/YourUsername/Downloads/your-key.pem" ubuntu@your-ec2-ip
   ```

2. **Check username:**
   - Ubuntu: `ubuntu`
   - Amazon Linux: `ec2-user`
   - Debian: `admin`

3. **Check key permissions (in Git Bash):**
   ```bash
   chmod 400 your-key.pem
   ```

4. **Verify Security Group:**
   - Port 22 must be open
   - Your IP must be allowed (or 0.0.0.0/0 for testing)

### Issue: "Could not resolve hostname"

**Solution:**
- Use public IP address, not private IP
- Get IP from EC2 Console → Instances → Your instance

### Issue: "Connection timed out"

**Solutions:**

1. **Check Security Group:**
   - Port 22 must be open
   - Your IP must be in allowed list

2. **Check Instance Status:**
   - Instance must be "Running"
   - Status checks must be "2/2 checks passed"

3. **Check Firewall:**
   - Windows Firewall might block SSH
   - Temporarily disable to test

### Issue: "WARNING: UNPROTECTED PRIVATE KEY FILE!"

**Solution (Git Bash):**
```bash
chmod 400 your-key.pem
```

**Solution (PowerShell - if using WSL):**
```bash
# In WSL
chmod 400 /mnt/c/Users/YourUsername/Downloads/your-key.pem
```

---

## 🛠️ Alternative: Use WSL (Windows Subsystem for Linux)

If you have WSL installed:

```bash
# Open WSL (Ubuntu)
wsl

# Navigate to Windows files
cd /mnt/c/Users/YourUsername/Downloads

# Set permissions
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ubuntu@your-ec2-ip
```

**Install WSL (if not installed):**
```powershell
# In PowerShell (as Administrator)
wsl --install
```

---

## 📁 File Transfer from Windows to EC2

### Using SCP (Git Bash or WSL)

```bash
# Upload file
scp -i your-key.pem local-file.txt ubuntu@your-ec2-ip:/tmp/

# Upload folder
scp -i your-key.pem -r local-folder ubuntu@your-ec2-ip:/tmp/

# Download file
scp -i your-key.pem ubuntu@your-ec2-ip:/tmp/file.txt ./
```

### Using WinSCP (GUI Tool)

1. Download WinSCP: https://winscp.net/
2. Open WinSCP
3. Enter:
   - **Host name**: `your-ec2-ip`
   - **User name**: `ubuntu`
   - **Private key file**: Browse to your `.ppk` file (convert .pem to .ppk first using PuTTYgen)
4. Click **Login**
5. Drag and drop files

---

## ✅ Quick Checklist for Windows Users

- [ ] Git for Windows installed (for Git Bash)
- [ ] EC2 instance launched (Ubuntu 22.04)
- [ ] Security Group configured (port 22 open)
- [ ] Key pair downloaded (.pem file)
- [ ] Can connect via SSH (test connection first)
- [ ] Code pushed to GitHub
- [ ] Ready to deploy!

---

## 🎯 Recommended Approach for Windows

**Best Option**: Use **Git Bash** (comes with Git for Windows)

1. ✅ Already have Git? You have Git Bash!
2. ✅ Native SSH support
3. ✅ Works like Linux terminal
4. ✅ Easy file transfer with SCP
5. ✅ No additional software needed

**Steps:**
```bash
# 1. Open Git Bash
# 2. Navigate to key file
cd ~/Downloads

# 3. Set permissions
chmod 400 your-key.pem

# 4. Connect
ssh -i your-key.pem ubuntu@your-ec2-ip

# 5. Deploy (on EC2)
cd /tmp
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo
cd temp-repo/deploy
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

---

## 🚀 Ready to Deploy?

1. **Install Git for Windows** (if not installed)
2. **Open Git Bash**
3. **Connect to EC2** (see Method 1 above)
4. **Run deployment script** (see deployment steps above)
5. **Access application** at `http://your-ec2-ip`

**That's it!** 🎉

---

## 📞 Need Help?

If you're still having issues:

1. **Try Git Bash first** (easiest)
2. **Check Security Group** (port 22 must be open)
3. **Verify instance is running** (EC2 Console)
4. **Use AWS Systems Manager** (no key needed!)

**Good luck! 🚀**

