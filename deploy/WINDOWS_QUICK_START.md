# 🪟 Windows Quick Start - 3 Steps to Deploy

## For Windows Users Deploying to Ubuntu EC2

---

## ✅ Step 1: Install Git for Windows (2 minutes)

1. Download: https://git-scm.com/download/win
2. Install with default settings
3. **Git Bash** will be installed automatically

**Why Git Bash?** It includes SSH and works like Linux terminal - perfect for connecting to EC2!

---

## ✅ Step 2: Connect to EC2 (1 minute)

### Open Git Bash and run:

```bash
# Navigate to where your .pem key file is
cd ~/Downloads

# Set permissions (required for SSH)
chmod 400 your-key.pem

# Connect to EC2 (replace with your values)
ssh -i your-key.pem ubuntu@your-ec2-ip

# Example:
# ssh -i glassshop-key.pem ubuntu@54.123.45.67
```

**If connection fails:**
- Check Security Group: Port 22 must be open
- Use public IP (not private IP)
- Make sure instance is "Running"

---

## ✅ Step 3: Deploy Application (15-20 minutes)

### Once connected to EC2, run:

```bash
# Clone your repository
cd /tmp
git clone https://github.com/YOUR_USERNAME/GlassShopApplication.git temp-repo

# Navigate to deploy folder
cd temp-repo/deploy

# Run deployment script
chmod +x deploy-from-github.sh
sudo ./deploy-from-github.sh
```

**When prompted:**
- Enter your GitHub repository URL
- Enter branch name (default: `master`)
- Wait 15-20 minutes (script does everything!)

---

## 🎉 Done!

Open browser on Windows:
```
http://your-ec2-ip
```

**That's it!** Your application is live! 🚀

---

## 🔧 Troubleshooting

### Can't Connect?

**Try this:**
```bash
# Use full path with quotes
ssh -i "C:/Users/YourUsername/Downloads/your-key.pem" ubuntu@your-ec2-ip
```

### Permission Denied?

```bash
# Make sure you're using 'ubuntu' (not 'ec2-user') for Ubuntu instances
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Still Having Issues?

Use **AWS Systems Manager** (no key needed!):
1. Go to AWS Console → Systems Manager → Session Manager
2. Click "Start session"
3. Select your EC2 instance
4. Browser-based terminal opens!

---

## 📋 What You Need

- [ ] Git for Windows installed
- [ ] EC2 instance running (Ubuntu 22.04)
- [ ] Security Group allows port 22 (SSH)
- [ ] Key pair file (.pem) downloaded
- [ ] Code pushed to GitHub

---

**Ready? Let's go! 🚀**

