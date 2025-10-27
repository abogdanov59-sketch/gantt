package com.example.platform.workflow

import com.example.platform.common.ApiError
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.util.getOrFail
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.flowable.dmn.engine.DmnEngine
import org.flowable.dmn.engine.DmnEngineConfiguration
import org.flowable.engine.ProcessEngine
import org.flowable.engine.ProcessEngineConfiguration
import org.flowable.engine.runtime.ProcessInstance
import org.slf4j.LoggerFactory
import java.io.File
import java.io.InputStream

private val logger = LoggerFactory.getLogger("workflow-service")

fun Application.module() {
    val workflow = WorkflowService()

    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; prettyPrint = true })
    }
    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            logger.warn("Bad request", cause)
            call.respond(HttpStatusCode.BadRequest, ApiError(code = "validation_error", message = cause.message ?: "invalid request"))
        }
        exception<Throwable> { call, cause ->
            logger.error("Unexpected error", cause)
            call.respond(HttpStatusCode.InternalServerError, ApiError(code = "internal_error", message = "unexpected error"))
        }
    }

    routing {
        workflowRoutes(workflow)
    }
}

private fun Route.workflowRoutes(service: WorkflowService) {
    post("/workflow/processes/{key}/start") {
        val key = call.parameters.getOrFail("key")
        val request = call.receive<StartProcessRequest>()
        val instance = service.startProcess(key, request)
        call.respond(StartProcessResponse(instanceId = instance.id, definitionId = instance.processDefinitionId))
    }

    get("/workflow/tasks") {
        val tasks = service.listTasks()
        call.respond(tasks)
    }

    post("/workflow/tasks/{id}/complete") {
        val id = call.parameters.getOrFail("id")
        val request = call.receive<CompleteTaskRequest>()
        service.completeTask(id, request)
        call.respond(HttpStatusCode.Accepted, mapOf("status" to "completed"))
    }

    post("/workflow/decision-tables/{key}/evaluate") {
        val key = call.parameters.getOrFail("key")
        val request = call.receive<EvaluateDecisionRequest>()
        val result = service.evaluateDecision(key, request)
        call.respond(result)
    }
}

class WorkflowService {
    private val processEngine: ProcessEngine = buildProcessEngine()
    private val dmnEngine: DmnEngine = buildDmnEngine()

    init {
        deployResources("bpmn") { name, stream ->
            processEngine.repositoryService.createDeployment().addInputStream(name, stream).deploy()
        }
        deployResources("dmn") { name, stream ->
            dmnEngine.repositoryService.createDeployment().addInputStream(name, stream).deploy()
        }
    }

    fun startProcess(key: String, request: StartProcessRequest): ProcessInstance {
        val variables = mutableMapOf<String, Any>()
        variables.putAll(request.variables)
        variables["initiator"] = request.initiator
        return processEngine.runtimeService.startProcessInstanceByKey(key, variables)
    }

    fun listTasks(): List<TaskRepresentation> = processEngine.taskService.createTaskQuery().list().map {
        TaskRepresentation(
            id = it.id,
            name = it.name,
            assignee = it.assignee,
            processInstanceId = it.processInstanceId
        )
    }

    fun completeTask(taskId: String, request: CompleteTaskRequest) {
        val task = processEngine.taskService.createTaskQuery().taskId(taskId).singleResult()
            ?: throw IllegalArgumentException("task $taskId not found")
        val variables = mutableMapOf<String, Any>()
        variables.putAll(request.variables)
        processEngine.taskService.complete(task.id, variables)
    }

    fun evaluateDecision(key: String, request: EvaluateDecisionRequest): Map<String, Any> {
        val decision = dmnEngine.decisionService.createDecisionExecutionBuilder()
            .decisionKey(key)
            .variables(mutableMapOf<String, Any>().apply { putAll(request.variables) })
            .executeWithSingleResult()
        return decision.resultVariables
    }

    private fun buildProcessEngine(): ProcessEngine =
        ProcessEngineConfiguration.createStandaloneInMemProcessEngineConfiguration()
            .setDatabaseSchemaUpdate(ProcessEngineConfiguration.DB_SCHEMA_UPDATE_TRUE)
            .setJdbcUrl("jdbc:h2:mem:flowable;DB_CLOSE_DELAY=1000")
            .setJdbcDriver("org.h2.Driver")
            .setJdbcUsername("sa")
            .setJdbcPassword("")
            .buildProcessEngine()

    private fun buildDmnEngine(): DmnEngine =
        DmnEngineConfiguration.createStandaloneInMemDmnEngineConfiguration()
            .setDatabaseSchemaUpdate(DmnEngineConfiguration.DB_SCHEMA_UPDATE_TRUE)
            .setJdbcUrl("jdbc:h2:mem:dmn;DB_CLOSE_DELAY=1000")
            .setJdbcDriver("org.h2.Driver")
            .setJdbcUsername("sa")
            .setJdbcPassword("")
            .buildEngine()

    private fun deployResources(folder: String, deploy: (String, InputStream) -> Unit) {
        val classLoader = Thread.currentThread().contextClassLoader
        classLoader?.getResources(folder)?.toList()?.flatMap { url ->
            val file = java.io.File(url.toURI())
            if (file.isDirectory) file.listFiles()?.map { it.name to it.inputStream() } ?: emptyList() else emptyList()
        }?.forEach { (name, stream) ->
            stream.use { deploy(name, it) }
            logger.info("Deployed resource {} from {}", name, folder)
        }
    }
}

@Serializable
data class StartProcessRequest(
    val initiator: String,
    val variables: Map<String, String> = emptyMap()
)

@Serializable
data class StartProcessResponse(
    val instanceId: String,
    val definitionId: String
)

@Serializable
data class TaskRepresentation(
    val id: String,
    val name: String?,
    val assignee: String?,
    val processInstanceId: String
)

@Serializable
data class CompleteTaskRequest(
    val variables: Map<String, String> = emptyMap()
)

@Serializable
data class EvaluateDecisionRequest(
    val variables: Map<String, String> = emptyMap()
)
