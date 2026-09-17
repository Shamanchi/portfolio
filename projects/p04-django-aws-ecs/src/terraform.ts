import type { DjangoApp } from "./model.ts";
import { buildTaskDefinition, logGroupName } from "./taskdef.ts";

export const TERRAFORM_TEMPLATE = `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "STATE_BUCKET_PLACEHOLDER"
    key            = "app/terraform.tfstate"
    region         = "REGION_PLACEHOLDER"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
}

# The module below renders the local variables from the same model the CLI uses.
`;

export function renderTerraform(app: DjangoApp): string {
  const task = buildTaskDefinition(app);
  return `${TERRAFORM_TEMPLATE}
locals {
  app_name     = "${app.appName}"
  region       = var.region
  task_is_json = <<TASK
${JSON.stringify(task, null, 2)}
TASK
}

resource "aws_ecs_cluster" "app" {
  name = "${app.clusterName}"
}

resource "aws_cloudwatch_log_group" "app" {
  name = "${logGroupName(app)}"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${app.appName}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "${task.cpu}"
  memory                   = "${task.memory}"
  execution_role_arn       = "arn:aws:iam::ACCOUNT_ID_PLACEHOLDER:role/${app.appName}-execution"
  task_role_arn            = "arn:aws:iam::ACCOUNT_ID_PLACEHOLDER:role/${app.appName}-task"
  container_definitions    = local.task_is_json
}

resource "aws_ecs_service" "app" {
  name            = "${app.appName}-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = ${app.desiredCount}
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_security_group_id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "${app.appName}"
    container_port   = ${app.container.port}
  }
}

resource "aws_appautoscaling_target" "app" {
  service_namespace  = "ecs"
  resource_id        = "service/\${aws_ecs_cluster.app.name}/\${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = ${app.minCapacity}
  max_capacity       = ${app.maxCapacity}
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${app.appName}-cpu-auto-scaling"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.app.service_namespace
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = ${app.cpuTargetPercent}
  }
}

variable "region" {
  type    = string
  default = "${app.region}"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "app_security_group_id" {
  type = string
}

variable "target_group_arn" {
  type = string
}
`;
}