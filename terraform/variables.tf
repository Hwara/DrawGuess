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

variable "create_www_redirect" {
  description = "www 서브도메인 생성 여부"
  type        = bool
  default     = true
}

# CloudFront 설정
variable "cloudfront_price_class" {
  description = "CloudFront 가격 등급 (비용 최적화)"
  type        = string
  default     = "PriceClass_100"  # 북미, 유럽만 (가장 저렴)
  
  validation {
    condition = contains([
      "PriceClass_All",     # 전 세계 (가장 비쌈)
      "PriceClass_200",     # 북미, 유럽, 아시아, 중동, 아프리카
      "PriceClass_100"      # 북미, 유럽만 (가장 저렴)
    ], var.cloudfront_price_class)
    error_message = "올바른 CloudFront 가격 등급을 선택해주세요."
  }
}

# 모니터링 및 알림
variable "notification_email" {
  description = "알림을 받을 이메일 주소"
  type        = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_email))
    error_message = "올바른 이메일 형식을 입력해주세요."
  }
}

variable "monthly_budget_limit" {
  description = "월간 예산 한도 (USD)"
  type        = string
  default     = "10"
  
  validation {
    condition     = can(tonumber(var.monthly_budget_limit)) && tonumber(var.monthly_budget_limit) > 0
    error_message = "예산 한도는 양수여야 합니다."
  }
}

# 태그 설정
variable "additional_tags" {
  description = "추가 태그"
  type        = map(string)
  default     = {}
}

# 개발용 설정
variable "enable_deletion_protection" {
  description = "리소스 삭제 보호 활성화"
  type        = bool
  default     = false
}

# 백업 설정  
variable "s3_versioning_enabled" {
  description = "S3 버킷 버전 관리 활성화"
  type        = bool
  default     = true
}

# 보안 설정
variable "allowed_countries" {
  description = "허용할 국가 코드 목록 (비워두면 전 세계 허용)"
  type        = list(string)
  default     = []
}

# 성능 설정
variable "s3_transfer_acceleration" {
  description = "S3 전송 가속화 활성화"
  type        = bool
  default     = false
}