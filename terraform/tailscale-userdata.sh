#!/bin/bash
# ========================================
# Tailscale 자동 설치 및 설정 스크립트
# Ubuntu 24.04 LTS 최적화
# ========================================

set -e

# 로그 설정
exec > >(tee /var/log/tailscale-setup.log)
exec 2>&1

echo "=========================================="
echo "Tailscale 설치 시작: $(date)"
echo "Ubuntu $(lsb_release -rs) $(lsb_release -cs)"
echo "=========================================="

# 시스템 업데이트
echo "시스템 업데이트 중..."
apt-get update -y
apt-get upgrade -y

# 필수 패키지 설치 (Ubuntu 24.04 최적화)
echo "필수 패키지 설치 중..."
apt-get install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    software-properties-common \
    htop \
    jq \
    unzip

# Tailscale 설치 (공식 스크립트 사용)
echo "Tailscale 설치 중..."
curl -fsSL https://tailscale.com/install.sh | sh

# IP 포워딩 활성화 (라우터 역할을 위해)
echo "IP 포워딩 활성화 중..."
echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' >> /etc/sysctl.conf
sysctl -p

# 방화벽 설정 (Ubuntu 24.04는 기본적으로 ufw 사용)
echo "방화벽 설정 중..."
ufw --force enable
ufw allow ssh
ufw allow 41641/udp  # Tailscale

# Tailscale 시작 (Auth Key 사용)
echo "Tailscale 시작 중..."
if [ -n "${tailscale_auth_key}" ] && [ "${tailscale_auth_key}" != "" ]; then
    echo "Auth Key를 사용하여 Tailscale 연결 중..."
    tailscale up --authkey="${tailscale_auth_key}" --advertise-routes=10.0.0.0/16 --accept-routes
else
    echo "Auth Key가 설정되지 않았습니다. 수동으로 연결해야 합니다."
    echo "다음 명령어를 실행하여 수동으로 연결하세요:"
    echo "sudo tailscale up --advertise-routes=10.0.0.0/16 --accept-routes"
    echo ""
    echo "인증 URL이 표시되면 웹 브라우저에서 접속하여 인증을 완료하세요."
fi

# Tailscale 상태 확인
echo "Tailscale 상태 확인 중..."
sleep 10
tailscale status || echo "Tailscale이 아직 연결되지 않았습니다. 수동 인증이 필요할 수 있습니다."

# 네트워크 정보 출력
echo "=========================================="
echo "네트워크 정보:"
echo "Public IP: $(curl -s -m 10 ifconfig.me || echo 'Unable to fetch')"
echo "Private IP: $(hostname -I | awk '{print $1}')"
echo "Tailscale IP: $(tailscale ip -4 2>/dev/null || echo 'Not connected yet')"
echo "OS Version: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "=========================================="

# CloudWatch 에이전트 설치 (Ubuntu 24.04 호환)
echo "CloudWatch 에이전트 설치 중..."
wget -q https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb || apt-get install -f -y

# 시스템 최적화 (Ubuntu 24.04 특화)
echo "시스템 최적화 중..."
# 자동 업데이트 설정 (보안 패치만)
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}:${distro_codename}-updates";
};
EOF

# 타임존 설정 (한국)
timedatectl set-timezone Asia/Seoul

# 완료 메시지
echo "=========================================="
echo "Tailscale 설치 완료: $(date)"
echo "EC2 인스턴스가 준비되었습니다!"
echo "=========================================="

# 재부팅 시 Tailscale 자동 시작 설정
systemctl enable tailscaled

# 시스템 정보 요약
echo "시스템 정보 요약:"
echo "- OS: $(lsb_release -d | cut -f2)"
echo "- Tailscale 버전: $(tailscale version | head -n1)"
echo "- 메모리: $(free -h | grep Mem | awk '{print $2}')"
echo "- 디스크: $(df -h / | tail -n1 | awk '{print $4}') 여유공간"
echo ""
echo "설치 로그는 /var/log/tailscale-setup.log에서 확인할 수 있습니다."