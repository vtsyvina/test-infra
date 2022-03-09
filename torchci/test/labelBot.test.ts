import nock from "nock";
import * as probot from "probot";
import * as utils from "./utils";
import labelBot from "lib/bot/labelBot";

nock.disableNetConnect();

describe("label-bot", () => {
  let probot: probot.Probot;

  const existingRepoLabelsResponse = [
    {
      id: 1301447942,
      node_id: "MDU6TGFiZWwxMzAxNDQ3OTQy",
      url: "https://api.github.com/repos/pytorch/pytorch/labels/enhancement",
      name: "enhancement",
      color: "ffc6f4",
      default: true,
      description:
        "Not as big of a feature, but technically not a bug. Should be easy to fix",
    },
    {
      id: 1150417147,
      node_id: "MDU6TGFiZWwxMTUwNDE3MTQ3",
      url: "https://api.github.com/repos/pytorch/pytorch/labels/good%20first%20issue",
      name: "good first issue",
      color: "34c182",
      default: true,
      description: "",
    },
  ];

  beforeEach(() => {
    probot = utils.testProbot();
    probot.load(labelBot);
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  test("random pr comment no reactoin", async () => {
    const event = require("./fixtures/pull_request_comment.json");
    const scope = nock("https://api.github.com");
    await probot.receive(event);
    if (!scope.isDone()) {
      console.error("pending mocks: %j", scope.pendingMocks());
    }
    scope.done();
  });

  test("random issue comment no event", async () => {
    const event = require("./fixtures/issue_comment.json");
    const scope = nock("https://api.github.com");
    await probot.receive(event);
    if (!scope.isDone()) {
      console.error("pending mocks: %j", scope.pendingMocks());
    }
    scope.done();
  });

  test("label comment on issue triggers confused reaction", async () => {
    const event = require("./fixtures/issue_comment.json");
    event.payload.comment.body = "@pytorchbot label enhancement";

    const owner = event.payload.repository.owner.login;
    const repo = event.payload.repository.name;
    const comment_number = event.payload.comment.id;
    const scope = nock("https://api.github.com")
      .post(
        `/repos/${owner}/${repo}/issues/comments/${comment_number}/reactions`,
        (body) => {
          expect(JSON.stringify(body)).toContain('{"content":"confused"}');
          return true;
        }
      )
      .reply(200, {});
    await probot.receive(event);
    if (!scope.isDone()) {
      console.error("pending mocks: %j", scope.pendingMocks());
    }
    scope.done();
  });

  test("label comment with one label on pull request triggers add label and like", async () => {
    const event = require("./fixtures/pull_request_comment.json");

    event.payload.comment.body = "@pytorchbot label enhancement";

    const owner = event.payload.repository.owner.login;
    const repo = event.payload.repository.name;
    const pr_number = event.payload.issue.number;
    const comment_number = event.payload.comment.id;
    const scope = nock("https://api.github.com")
      .get(`/repos/${owner}/${repo}/labels?per_page=100&page=0`)
      .reply(200, existingRepoLabelsResponse)
      .post(
        `/repos/${owner}/${repo}/issues/comments/${comment_number}/reactions`,
        (body) => {
          expect(JSON.stringify(body)).toContain('{"content":"+1"}');
          return true;
        }
      )
      .reply(200, {})
      .post(`/repos/${owner}/${repo}/issues/${pr_number}/labels`, (body) => {
        expect(JSON.stringify(body)).toContain(`{"labels":["enhancement"]}`);
        return true;
      })
      .reply(200, {});
    await probot.receive(event);
    if (!scope.isDone()) {
      console.error("pending mocks: %j", scope.pendingMocks());
    }
    scope.done();
  });

  test("label comment with several labels on pull request triggers add label and like", async () => {
    const event = require("./fixtures/pull_request_comment.json");

    event.payload.comment.body =
      "@pytorchbot label enhancement,  good first issue   , test:111";

    const owner = event.payload.repository.owner.login;
    const repo = event.payload.repository.name;
    const pr_number = event.payload.issue.number;
    const comment_number = event.payload.comment.id;
    const scope = nock("https://api.github.com")
      .get(`/repos/${owner}/${repo}/labels?per_page=100&page=0`)
      .reply(200, existingRepoLabelsResponse)
      .post(
        `/repos/${owner}/${repo}/issues/comments/${comment_number}/reactions`,
        (body) => {
          expect(JSON.stringify(body)).toContain('{"content":"+1"}');
          return true;
        }
      )
      .reply(200, {})
      .post(`/repos/${owner}/${repo}/issues/${pr_number}/labels`, (body) => {
        expect(JSON.stringify(body)).toContain(
          `{"labels":["enhancement","good first issue"]}`
        );
        return true;
      })
      .reply(200, {})
      .post(`/repos/${owner}/${repo}/issues/${pr_number}/comments`, (body) => {
        expect(JSON.stringify(body)).toContain(
          '{"body":"Didn\'t find following labels among repository labels: test:111"}'
        );
        return true;
      })
      .reply(200, {});
    await probot.receive(event);
    if (!scope.isDone()) {
      console.error("pending mocks: %j", scope.pendingMocks());
    }
    scope.done();
  });
});
