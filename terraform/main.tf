# ========================================
# DrawGuess Phase 1: 정적 웹사이트 인프라
# ========================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS 프로바이더 설정
provider "aws" {
  region = var.aws_region
  
  # 공통 태그 (모든 리소스에 적용)
  default_tags {
    tags = {
      Project     = "DrawGuess"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# CloudFront를 위한 us-east-1 프로바이더 (SSL 인증서용)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ========================================
# 로컬 변수 정의 (여기에 추가!)
# ========================================

locals {
  # 공통 이름 접두사
  name_prefix = "${var.project_name}-${var.environment}"
  
  # 공통 태그 (provider default_tags와 병합)
  common_tags = merge(
    {
      Project     = "DrawGuess"
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.additional_tags
  )
}

# ========================================
# S3 버킷 (웹사이트 호스팅)
# ========================================

# 웹사이트 호스팅용 S3 버킷
resource "aws_s3_bucket" "website" {
  bucket = "${var.domain_name}"
}

# S3 버킷 웹사이트 설정
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# ========================================
# S3 버킷 정책 (CloudFlare만 접근 허용)
# ========================================

# S3 버킷 정책
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::hwara-dev.kr/*",
            "Condition": {
                "IpAddress": {
                    "aws:SourceIp": [
                        "2400:cb00::/32",
                        "2606:4700::/32",
                        "2803:f800::/32",
                        "2405:b500::/32",
                        "2405:8100::/32",
                        "2a06:98c0::/29",
                        "2c0f:f248::/32",
                        "173.245.48.0/20",
                        "103.21.244.0/22",
                        "103.22.200.0/22",
                        "103.31.4.0/22",
                        "141.101.64.0/18",
                        "108.162.192.0/18",
                        "190.93.240.0/20",
                        "188.114.96.0/20",
                        "197.234.240.0/22",
                        "198.41.128.0/17",
                        "162.158.0.0/15",
                        "172.64.0.0/13",
                        "131.0.72.0/22",
                        "104.16.0.0/13",
                        "104.24.0.0/14"
                    ]
                }
            }
        }
    ]
  })
}

# ========================================
# DrawGuess 프로젝트 출력값
# ========================================

# 배포 정보 (GitHub Actions에서 사용)
output "deployment_info" {
  description = "배포에 필요한 정보"
  value = {
    s3_bucket                  = aws_s3_bucket.website.bucket
    website_url               = "https://${var.domain_name}"
    aws_region                = var.aws_region
  }
  sensitive = false
}
