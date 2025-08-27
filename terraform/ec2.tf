# ========================================
# EC2 인스턴스 - Tailscale VPN 브릿지
# ========================================

# VPC 생성
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

# 인터넷 게이트웨이
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-igw"
  })
}

# 퍼블릭 서브넷
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-subnet"
  })
}

# 프라이빗 서브넷 (RDS용)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}a"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-subnet-a"
  })
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}c"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-subnet-b"
  })
}

# 라우팅 테이블
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 보안 그룹
resource "aws_security_group" "tailscale" {
  name        = "${local.name_prefix}-tailscale-sg"
  description = "Security group for Tailscale VPN instance"
  vpc_id      = aws_vpc.main.id

  # SSH 접근 (본인 IP만 허용하는 것이 좋습니다)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # 실제로는 본인 IP로 제한하세요
  }

  # Tailscale UDP 포트
  ingress {
    from_port   = 41641
    to_port     = 41641
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # nginx 80 포트
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Tailscale IP 대역
  }

  # 모든 아웃바운드 트래픽 허용
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-tailscale-sg"
  })
}

# RDS용 보안 그룹
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  # PostgreSQL 포트 (Tailscale 네트워크에서만 접근)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tailscale.id]
  }

  # Tailscale IP 대역에서 접근 허용
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["100.64.0.0/10"]  # Tailscale IP 대역
  }

  

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-sg"
  })
}

# EC2 키 페어 (SSH 접근용)
resource "aws_key_pair" "main" {
  key_name   = "${local.name_prefix}-keypair"
  public_key = file("~/.ssh/id_rsa.pub")  # 본인의 SSH 공개키 경로

  tags = local.common_tags
}

# Tailscale 설치 스크립트
locals {
  tailscale_userdata = base64encode(templatefile("${path.module}/tailscale-userdata.sh", {
    tailscale_auth_key = var.tailscale_auth_key
    distro_id         = "Ubuntu"
    distro_codename   = "noble"
  }))
}

# EC2 인스턴스
resource "aws_instance" "tailscale" {
  ami                    = "ami-0ff140cadd6129869"
  instance_type          = "t3.micro"  # 프리티어
  key_name               = aws_key_pair.main.key_name
  vpc_security_group_ids = [aws_security_group.tailscale.id]
  subnet_id              = aws_subnet.public.id

  user_data = local.tailscale_userdata

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-tailscale"
  })
}

# 출력값
output "tailscale_instance_ip" {
  value       = aws_instance.tailscale.public_ip
  description = "Tailscale EC2 instance public IP"
}

output "tailscale_instance_id" {
  value       = aws_instance.tailscale.id
  description = "Tailscale EC2 instance ID"
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "private_subnet_ids" {
  value       = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  description = "Private subnet IDs for RDS"
}