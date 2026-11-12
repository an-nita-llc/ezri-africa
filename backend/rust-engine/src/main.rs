use axum::{
    routing::{get, post},
    Json, Router,
};
use ezri_rust_engine::{calculate_valuation, ValuationRequest, ValuationResponse};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/valuation", post(valuation_handler))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8003").await.unwrap();
    println!("Ezri High-Performance Rust Valuation Engine running on port 8003");
    axum::serve(listener, app).await.unwrap();
}

async fn health_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "ok": true,
        "service": "rust-valuation-engine",
        "language": "Rust (Tokio + Axum + SHA-256)",
        "port": 8003
    }))
}

async fn valuation_handler(Json(req): Json<ValuationRequest>) -> Json<ValuationResponse> {
    let res = calculate_valuation(&req);
    Json(res)
}
