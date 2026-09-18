import type { TwoTierModel } from "./model.ts";

export function renderTerraform(model: TwoTierModel): string {
  return `# AWS two-tier architecture, rendered by src/hcl.ts.
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${model.region}"
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "${model.vpcCidr}"
  enable_dns_hostnames = true

  tags = {
    Name = "two-tier-vpc"
  }
}

resource "aws_subnet" "web" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "${model.webCidr}"
  availability_zone       = "${model.az}"
  map_public_ip_on_launch = true

  tags = {
    Name = "web-tier"
  }
}

resource "aws_subnet" "db" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "${model.dbCidr}"
  availability_zone = "${model.az}"

  tags = {
    Name = "db-tier"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "two-tier-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "two-tier-public"
  }
}

resource "aws_route_table_association" "web" {
  subnet_id      = aws_subnet.web.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "inbound web traffic, outbound any"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "http"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "https"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "db-sg"
  description = "database reachable only from the web tier"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "app to db"
    from_port       = ${model.dbPort}
    to_port         = ${model.dbPort}
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  count                       = ${model.webCount}
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "${model.webInstanceType}"
  subnet_id                   = aws_subnet.web.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true

  user_data = <<-EOF
    #!/bin/bash
    echo "two-tier demo web node" > /etc/motd
  EOF

  tags = {
    Name = "web-tier"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "two-tier-db-subnets"
  subnet_ids = [aws_subnet.db.id]
}

resource "aws_db_instance" "main" {
  identifier                = "two-tier-db"
  engine                    = "${model.dbEngine}"
  engine_version            = "${model.dbVersion}"
  instance_class            = "${model.dbInstanceClass}"
  allocated_storage         = ${model.dbStorageGb}
  db_name                   = "appdb"
  username                  = "app"
  manage_master_user_password = true
  port                      = ${model.dbPort}
  vpc_security_group_ids    = [aws_security_group.db.id]
  db_subnet_group_name      = aws_db_subnet_group.main.name
  skip_final_snapshot       = true

  tags = {
    Name = "two-tier-db"
  }
}

output "web_public_ips" {
  value = aws_instance.web[*].public_ip
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}
`;
}