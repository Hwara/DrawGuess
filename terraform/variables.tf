# ========================================
# DrawGuess 프로젝트 변수 정의
# ========================================

# 프로젝트 기본 정보
variable "project_name" {
  description = "프로젝트 이름"
  type        = string
  default     = "drawguess"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "프로젝트 이름은 소문자, 숫자, 하이픈만 사용 가능합니다."
  }
}

variable "environment" {
  description = "배포 환경 (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "환경은 dev, staging, prod 중 하나여야 합니다."
  }
}

# AWS 설정
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"  # 서울 리전
}

# 도메인 설정
variable "domain_name" {
  description = "메인 도메인명 (예: hwara-dev.kr)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.domain_name))
    error_message = "올바른 도메인 형식을 입력해주세요."
  }
}

# 태그 설정
variable "additional_tags" {
  description = "추가 태그"
  type        = map(string)
  default     = {}
}

# ========================================
# Phase 4 - 하이브리드 클라우드 변수들
# ========================================

# Tailscale 설정
variable "tailscale_auth_key" {
  description = "Tailscale 인증 키 (선택사항 - 수동 설정도 가능)"
  type        = string
  default     = ""
  sensitive   = true
}

# RDS 설정
variable "db_instance_class" {
  description = "RDS 인스턴스 클래스"
  type        = string
  default     = "db.t3.micro"  # 프리티어
}

variable "db_allocated_storage" {
  description = "RDS 할당 스토리지 (GB)"
  type        = number
  default     = 20  # 프리티어 최소값
}

variable "db_name" {
  description = "데이터베이스 이름"
  type        = string
  default     = "drawguess"
}

# 데이터베이스 사용자명
variable "db_username" {
  description = "데이터베이스 사용자명"
  type        = string
}

# 데이터베이스 비밀번호 (수정 필요)
variable "db_password" {
  description = "데이터베이스 비밀번호"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.db_password) >= 8
    error_message = "데이터베이스 비밀번호는 최소 8자 이상이어야 합니다."
  }
}
# 네트워크 설정
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "퍼블릭 서브넷 CIDR 블록"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidrs" {
  description = "프라이빗 서브넷 CIDR 블록들"
  type        = list(string)
  default     = ["10.0.2.0/24", "10.0.3.0/24"]
}

# 보안 설정
variable "allowed_ssh_cidrs" {
  description = "SSH 접근을 허용할 IP CIDR 블록들"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # 실제로는 본인 IP로 제한하세요
}

variable "enable_rds_deletion_protection" {
  description = "RDS 삭제 보호 활성화"
  type        = bool
  default     = false  # 개발 환경에서는 false
}

# 모니터링 설정
variable "enable_enhanced_monitoring" {
  description = "RDS 향상된 모니터링 활성화"
  type        = bool
  default     = false  # 비용 절약을 위해 개발 환경에서는 false
}